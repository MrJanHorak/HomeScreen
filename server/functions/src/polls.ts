import {onRequest, Request} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import type {Response} from "express";
import {FieldValue} from "firebase-admin/firestore";
import type {Transaction, DocumentReference} from "firebase-admin/firestore";
import {randomBytes, createHash, createHmac, timingSafeEqual} from "crypto";
import {db, runUserTransaction, recordCodeRequest} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {encryptToken, decryptToken} from "./utils/crypto";
import {logSafeError} from "./utils/safeLog";
import {parsePollDefinition, parseBallot, pollState, pollLocalDeadline, validTimeZone, resultsAllowed} from "./utils/polls";
import type {PollRound, PollTemplate, PollView, PollReceipt, PollResult} from "./utils/polls";
import {validPollId, validWidgetLayout} from "./utils/widgets";

class PollError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new PollError(status, message);
};
const id = () => randomBytes(16).toString("hex");
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
function sign(v: string): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return createHmac("sha256", secret).update(`poll-voter:${v}`).digest("hex");
}
function cookieIdentity(req: Request): string | null {
  const cookie = /(?:^|;\s*)__session=voter1\.([a-f0-9]{32})\.([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "");
  if (!cookie) return null;
  return timingSafeEqual(Buffer.from(cookie[2], "hex"), Buffer.from(sign(cookie[1]), "hex")) ? cookie[1] : null;
}
const csrfFor = (browser: string, token: string) => sign(`csrf:${browser}:${token}`);
function linkUrl(token: string): string {
  const base = process.env.PAIRING_URL;
  if (!base) throw new Error("PAIRING_URL is not configured");
  return new URL(`/vote/${token}`, base).toString();
}
function responseHeaders(res: Response) {
  res.set("Cache-Control", "private, no-store");
  res.set("Referrer-Policy", "no-referrer");
}
function handleError(res: Response, error: unknown) {
  if (error instanceof PollError) res.status(error.status).json({error: error.message});
  else {
    logSafeError("Poll request failed", error); res.status(500).json({error: "Could not complete the poll request. Try again."});
  }
}
function answerResults(answers: {docs: {id: string; data: () => Record<string, unknown>}[]}, round: PollRound): PollResult[] {
  return [...round.options.map((option) => ({...option, count: round.counts[option.id] || 0})),
    ...answers.docs.filter((d) => d.data().status === "approved")
      .map((d) => ({id: d.id, label: String(d.data().label), count: Number(d.data().count)}))];
}
async function viewRound(ref: DocumentReference, round: PollRound, privileged: boolean, voted = false): Promise<PollView> {
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) fail(410, "This poll is unavailable");
    const fresh = snapshot.data() as PollRound;
    const state = pollState(round.state === "closed" ? {...fresh, state: "closed"} : fresh, Date.now());
    const allowed = resultsAllowed({...fresh, state}, voted, privileged);
    const answers = allowed ? await tx.get(ref.collection("answers").limit(200)) : null;
    return {id: fresh.id, revision: fresh.revision, question: fresh.question, description: fresh.description, answerMode: fresh.answerMode,
      options: fresh.options, resultsVisibility: fresh.resultsVisibility, protection: fresh.protection, moderate: fresh.moderate,
      defaultDurationMinutes: fresh.defaultDurationMinutes, total: allowed ? fresh.total : 0,
      pendingCount: allowed ? fresh.pendingCount : 0, writtenCount: allowed ? fresh.writtenCount : 0,
      results: answers ? answerResults(answers, fresh) : null, state, endsAtMs: fresh.endsAtMs, timeZone: fresh.timeZone,
      ...(privileged && state === "open" ? {joinUrl: linkUrl(decryptToken(fresh.encryptedAccess))} : {})};
  }, {readOnly: true});
}
async function checkReference(transaction: Transaction, uid: string, deviceId: string) {
  const snapshot = await transaction.get(db.collection("users").doc(uid).collection("devices").doc(deviceId));
  if (!snapshot.exists || snapshot.data()?.revokedAtMs !== 0) fail(410, "The TV is no longer linked. This poll is unavailable.");
}

/** Owner library and round actions; TV sessions cannot manage polls. */
export async function handlePolls(req: Request, res: Response): Promise<void> {
  responseHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Sign in with Google to manage polls"}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Only the linked TV owner can manage polls"}); return;
  }
  const uid = identity.userId;
  const user = db.collection("users").doc(uid);
  const templates = user.collection("pollTemplates"); const rounds = user.collection("pollRounds");
  try {
    if (req.method === "GET") {
      const roundId = req.query.roundId;
      if (roundId !== undefined) {
        if (!validPollId(roundId)) fail(400, "Invalid round");
        const ref = rounds.doc(roundId as string); const round = (await ref.get()).data() as PollRound | undefined;
        if (!round) fail(404, "Poll not found");
        let query = ref.collection("ballots").orderBy("__name__").limit(100);
        if (typeof req.query.after === "string" && /^[a-f0-9]{64}$/.test(req.query.after)) query = query.startAfter(req.query.after);
        const [ballots, answers] = await Promise.all([query.get(), ref.collection("answers").limit(200).get()]);
        res.status(200).json({round: await viewRound(ref, round!, true), revision: round!.revision,
          ballots: ballots.docs.map((d) => ({id: d.id, ...d.data()})), next: ballots.size === 100 ? ballots.docs[99].id : null,
          answers: answers.docs.map((d) => ({id: d.id, ...d.data()}))}); return;
      }
      const [saved, active, devices, settings] = await Promise.all([templates.limit(100).get(), rounds.orderBy("createdAtMs", "desc").limit(100).get(),
        user.collection("devices").where("revokedAtMs", "==", 0).limit(100).get(), user.collection("appearance").doc("settings").get()]);
      const layout = settings.data()?.appearance?.widgetLayout;
      res.status(200).json({templates: saved.docs.map((d) => ({...d.data(), id: d.id})),
        rounds: await Promise.all(active.docs.map(async (d) => {
          const r = d.data() as PollRound;
          const device = devices.docs.find((v) => v.id === r.referenceDeviceId);
          return {...await viewRound(d.ref, device ? r : {...r, state: "closed"}, true), templateId: r.templateId,
            referenceDeviceId: r.referenceDeviceId, linked: !!device, displayed: validWidgetLayout(layout) && layout.widgets.some((w) => w.visible && w.roundId === r.id)};
        })), devices: devices.docs.map((d) => ({id: d.id, name: d.data().name, timeZone: d.data().timeZone || null,
          pollCapable: d.data().widgetLayoutVersion === 1, lastSeenAtMs: d.data().lastSeenAtMs || 0})), serverNowMs: Date.now()}); return;
    }
    if (req.method !== "POST") fail(405, "Method not allowed");
    const body = req.body || {};
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > 16384) fail(400, "Request is too large");
    const action = body.action;
    if (action === "saveTemplate") {
      const definition = parsePollDefinition(body.definition);
      if (!definition || (body.id !== undefined && !validPollId(body.id))) fail(400, "Check the question, choices, and poll settings");
      const templateId = body.id || id(); const ref = templates.doc(templateId);
      const result = await runUserTransaction(uid, async (tx) => {
        const [snapshot, all] = await Promise.all([tx.get(ref), tx.get(templates.limit(100))]);
        const existing = snapshot.data();
        if ((body.expectedRevision ?? 0) !== (existing?.revision || 0)) fail(409, "This saved poll changed. Reload before saving.");
        if (!existing && all.size >= 100) fail(400, "Keep up to 100 saved polls. Remove one first.");
        const template: PollTemplate = {...definition!, id: templateId, revision: (existing?.revision || 0) + 1, updatedAtMs: Date.now()};
        tx.set(ref, template); return template;
      });
      res.status(200).json({template: result}); return;
    }
    if (action === "deleteTemplate") {
      if (!validPollId(body.id)) fail(400, "Invalid saved poll");
      await runUserTransaction(uid, async (tx) => {
        const ref = templates.doc(body.id); const snapshot = await tx.get(ref);
        if (snapshot.data()?.revision !== body.expectedRevision) fail(409, "Saved poll changed. Reload first."); tx.delete(ref);
      });
      res.status(200).json({success: true}); return;
    }
    if (action === "startRound") {
      if (!validPollId(body.templateId) || !validPollId(body.referenceDeviceId)) fail(400, "Choose a saved poll and linked TV");
      const roundId = id(); const access = randomBytes(24).toString("hex"); const accessHash = hash(access);
      const round = await runUserTransaction(uid, async (tx) => {
        const [snapshot, device, all] = await Promise.all([tx.get(templates.doc(body.templateId)), tx.get(user.collection("devices").doc(body.referenceDeviceId)), tx.get(rounds.limit(100))]);
        const template = snapshot.data() as PollTemplate | undefined;
        if (!template || device.data()?.revokedAtMs !== 0) fail(404, "Saved poll or TV no longer exists");
        if (all.size >= 100) fail(400, "Keep up to 100 rounds. Delete an old round first.");
        const reportedTimeZone = device.data()?.timeZone;
        const companionTimeZone = body.clientTimeZone ?? body.timeZone;
        const deadlineTimeZone = body.endsLocal ? body.deadlineTimeZone : undefined;
        if (deadlineTimeZone !== undefined && !validTimeZone(deadlineTimeZone)) fail(400, "Refresh the companion to detect its closing-time clock");
        // Preserve the clock labelled beside the input, even if a TV reports a
        // different timezone while the owner is completing the form.
        const timeZone = validTimeZone(deadlineTimeZone) ? deadlineTimeZone : validTimeZone(reportedTimeZone) ? reportedTimeZone :
          validTimeZone(companionTimeZone) ? companionTimeZone : "UTC";
        // Duration and open-ended rounds need no timezone. A wall-clock deadline
        // uses the TV's automatic report, or the explicitly labelled companion clock.
        if (body.endsLocal && !validTimeZone(deadlineTimeZone) && !validTimeZone(reportedTimeZone) && !validTimeZone(companionTimeZone)) {
          fail(400, "Refresh the companion or connect your TV to set a local closing time. You can start with the saved duration now.");
        }
        let endsAtMs: number | null;
        try {
          endsAtMs = body.endsLocal ? pollLocalDeadline(body.endsLocal, timeZone) :
          template!.defaultDurationMinutes ? Date.now() + template!.defaultDurationMinutes * 60000 : null;
        } catch (e) {
          fail(400, (e as Error).message);
        }
        if (endsAtMs! !== null && endsAtMs! <= Date.now()) fail(400, "Closing time must be in the future");
        const definition = parsePollDefinition(template)!;
        const next: PollRound = {...definition, id: roundId, templateId: template!.id, referenceDeviceId: body.referenceDeviceId, timeZone,
          endsAtMs: endsAtMs!, state: "open", createdAtMs: Date.now(), revision: 1, total: 0, counts: {}, writtenCount: 0, pendingCount: 0,
          accessHash, encryptedAccess: encryptToken(access), invitationCount: 0};
        tx.create(rounds.doc(roundId), next);
        tx.create(db.collection("poll_links").doc(accessHash), {userId: uid, roundId, referenceDeviceId: body.referenceDeviceId});
        return next;
      });
      res.status(200).json({round: await viewRound(rounds.doc(roundId), round, true)}); return;
    }
    if (!validPollId(body.roundId)) fail(400, "Invalid round");
    const ref = rounds.doc(body.roundId);
    if (action === "deleteRound") {
      await runUserTransaction(uid, async (tx) => {
        const s = await tx.get(ref); const r = s.data() as PollRound | undefined;
        if (!r) fail(404, "Poll not found"); if (r!.revision !== body.expectedRevision) fail(409, "Poll changed. Reload first.");
        tx.update(ref, {state: "archived", revision: r!.revision + 1}); tx.delete(db.collection("poll_links").doc(r!.accessHash));
      });
      await db.recursiveDelete(ref); res.status(200).json({success: true}); return;
    }
    const result = await runUserTransaction(uid, async (tx) => {
      const snapshot = await tx.get(ref); const r = snapshot.data() as PollRound | undefined;
      if (!r) fail(404, "Poll not found");
      if (r!.revision !== body.expectedRevision) fail(409, "Votes or settings changed. Reload and try again.");
      const now = Date.now(); const next = {...r!, revision: r!.revision + 1};
      if (action === "close") next.state = "closed";
      else if (action === "archive") {
        next.state = "archived"; tx.delete(db.collection("poll_links").doc(r!.accessHash));
      } else if (action === "extend") {
        if (pollState(r!, now) !== "open") fail(409, "Closed polls need a new round");
        try {
          next.endsAtMs = pollLocalDeadline(body.endsLocal, r!.timeZone);
        } catch (e) {
          fail(400, (e as Error).message);
        }
        if (next.endsAtMs === null || next.endsAtMs <= now || (r!.endsAtMs !== null && next.endsAtMs <= r!.endsAtMs)) fail(400, "Choose a later closing time");
      } else if (action === "rotateLink") {
        if (pollState(r!, now) !== "open") fail(409, "This poll is closed");
        const token = randomBytes(24).toString("hex"); next.accessHash = hash(token); next.encryptedAccess = encryptToken(token);
        tx.delete(db.collection("poll_links").doc(r!.accessHash)); tx.create(db.collection("poll_links").doc(next.accessHash), {userId: uid, roundId: r!.id, referenceDeviceId: r!.referenceDeviceId});
      } else if (action === "invitations") {
        if (r!.protection !== "invitation" || pollState(r!, now) !== "open" || !Number.isInteger(body.count) || body.count < 1 || body.count > 100 || r!.invitationCount + body.count > 1000) fail(400, "Issue 1–100 invitations for an open invitation poll");
        const codes = Array.from({length: body.count}, () => randomBytes(8).toString("hex").toUpperCase());
        for (const code of codes) tx.create(ref.collection("invitations").doc(hash(code)), {used: false});
        next.invitationCount += codes.length; tx.set(ref, next); return {codes};
      } else if (action === "moderate") {
        if (typeof body.answerId !== "string" || !/^[a-f0-9]{64}$/.test(body.answerId) || !["approved", "rejected"].includes(body.status)) fail(400, "Invalid answer review");
        const aRef = ref.collection("answers").doc(body.answerId); const a = (await tx.get(aRef)).data();
        if (!a) fail(404, "Answer not found");
        next.pendingCount += (body.status === "pending" ? Number(a!.count) : 0) - (a!.status === "pending" ? Number(a!.count) : 0);
        tx.update(aRef, {status: body.status});
      } else fail(400, "Unsupported poll action");
      tx.set(ref, {...next, ...(action === "archive" ? {archivedAtMs: now} : {})}); return {success: true};
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
}

/** Batched fresh feed, independently of provider summary caching. */
export async function handlePollFeed(req: Request, res: Response): Promise<void> {
  responseHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid TV session required"}); return;
  }
  try {
    const user = db.collection("users").doc(identity.userId);
    if (identity.deviceId) {
      const device = user.collection("devices").doc(identity.deviceId);
      const stored = (await device.get()).data();
      if (stored && stored.widgetLayoutVersion !== 1) {
        await runUserTransaction(identity.userId, async (tx) => {
          const s = await tx.get(device);
          if (s.data()?.revokedAtMs === 0) tx.update(device, {widgetLayoutVersion: 1});
        });
      }
    }
    const appearance = (await user.collection("appearance").doc("settings").get()).data()?.appearance;
    const layout = appearance?.widgetLayout;
    const ids = validWidgetLayout(layout) ? [...new Set(layout.widgets.filter((w) => w.kind === "poll" && w.visible).map((w) => w.roundId!))] : [];
    const views = await Promise.all(ids.map(async (roundId) => {
      const ref = user.collection("pollRounds").doc(roundId); const r = (await ref.get()).data() as PollRound | undefined;
      if (!r) return null;
      const device = (await user.collection("devices").doc(r.referenceDeviceId).get()).data();
      return viewRound(ref, device?.revokedAtMs === 0 ? r : {...r, state: "closed"}, true);
    }));
    res.status(200).json({rounds: views.filter(Boolean), serverNowMs: Date.now()});
  } catch (error) {
    handleError(res, error);
  }
}

/** Guests have only a signed browser credential and a scoped public poll link. */
export async function handlePollParticipant(req: Request, res: Response): Promise<void> {
  responseHeaders(res);
  try {
    if (!["GET", "POST"].includes(req.method)) fail(405, "Method not allowed");
    const token = req.method === "GET" ? req.query.token : req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) fail(404, "This poll link is unavailable");
    if (Buffer.byteLength(JSON.stringify(req.body || {}), "utf8") > 16384) fail(400, "Request is too large");
    const linkRef = db.collection("poll_links").doc(hash(token));
    const link = (await linkRef.get()).data();
    if (!link) fail(410, "This poll link is unavailable");
    const uid: string = link!.userId; const ref = db.collection("users").doc(uid).collection("pollRounds").doc(link!.roundId);
    let browser = cookieIdentity(req);
    if (!browser) {
      if (req.method === "POST") fail(403, "Allow cookies and reload the poll before voting");
      browser = id();
      res.set("Set-Cookie", `__session=voter1.${browser}.${sign(browser)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
    }
    const browserId = browser;
    const voterKey = sign(`${link!.roundId}:${browserId}`);
    if (req.method === "GET") {
      const data = await runUserTransaction(uid, async (tx) => {
        const [liveLink, round, ballot] = await Promise.all([tx.get(linkRef), tx.get(ref), tx.get(ref.collection("ballots").doc(voterKey))]);
        const r = round.data() as PollRound | undefined;
        if (!liveLink.exists || !r || r.accessHash !== linkRef.id || r.state === "archived") fail(410, "This poll is unavailable");
        await checkReference(tx, uid, r!.referenceDeviceId);
        return {round: r!, receipt: ballot.data() || null};
      });
      res.status(200).json({poll: await viewRound(ref, data.round, false, !!data.receipt), receipt: data.receipt ? {
        requestId: data.receipt.requestId, receivedAtMs: data.receipt.receivedAtMs} : null, csrf: csrfFor(browserId, token), serverNowMs: Date.now()}); return;
    }
    let allowedOrigin: string;
    try {
      allowedOrigin = new URL(process.env.PAIRING_URL || "").origin;
    } catch {
      throw new Error("PAIRING_URL is not configured");
    }
    const origins = new Set([allowedOrigin]);
    const canonical = new URL(allowedOrigin);
    if (canonical.hostname.endsWith(".firebaseapp.com")) origins.add(`https://${canonical.hostname.replace(/\.firebaseapp\.com$/, ".web.app")}`);
    if (canonical.hostname.endsWith(".web.app")) origins.add(`https://${canonical.hostname.replace(/\.web\.app$/, ".firebaseapp.com")}`);
    if (!origins.has(req.get("Origin") || "") || req.get("X-Poll-CSRF") !== csrfFor(browserId, token)) fail(403, "Reload this poll before voting");
    if (!await recordCodeRequest(`${hash(token)}:${browserId}`, "poll-vote", 30, 60000) ||
      !await recordCodeRequest(req.ip || "unknown", "poll-network", 300, 60000)) fail(429, "Too many attempts. Wait a minute and try again.");
    const receipt = await runUserTransaction(uid, async (tx) => {
      const [liveLink, snapshot, previous] = await Promise.all([tx.get(linkRef), tx.get(ref), tx.get(ref.collection("ballots").doc(voterKey))]);
      const r = snapshot.data() as PollRound | undefined;
      if (!liveLink.exists || !r || r.accessHash !== linkRef.id || r.state === "archived") fail(410, "This poll is unavailable");
      await checkReference(tx, uid, r!.referenceDeviceId);
      if (previous.exists) return previous.data() as PollReceipt;
      if (pollState(r!, Date.now()) !== "open") fail(410, "Voting has closed");
      if (r!.total >= 1000) fail(409, "This poll has reached its participant limit");
      const ballot = parseBallot(req.body, r!);
      if (!ballot) fail(400, "Enter your name and choose or write one answer");
      let invitation: DocumentReference | null = null;
      if (r!.protection === "invitation") {
        const code = typeof req.body.invitation === "string" ? req.body.invitation.trim().toUpperCase() : "";
        if (!/^[A-F0-9]{16}$/.test(code)) fail(400, "Enter your one-use invitation code");
        invitation = ref.collection("invitations").doc(hash(code)); const inv = await tx.get(invitation);
        if (!inv.exists || inv.data()?.used) fail(409, "This invitation is invalid or already used");
      }
      const next = {...r!, counts: {...r!.counts}, total: r!.total + 1, revision: r!.revision + 1};
      let answerRef: DocumentReference | null = null; let answer: Record<string, unknown> | null = null;
      if (ballot!.answer) {
        const normalized = ballot!.answer.toLocaleLowerCase("en-US"); answerRef = ref.collection("answers").doc(hash(normalized));
        const a = await tx.get(answerRef); const existing = a.data();
        if (!existing && Number(snapshot.data()?.answerCount || 0) >= 200) fail(409, "This poll has reached its written-answer limit");
        answer = {label: existing?.label || ballot!.answer, status: existing?.status || (r!.moderate ? "pending" : "approved"), count: Number(existing?.count || 0) + 1};
        next.writtenCount++; if (answer.status === "pending") next.pendingCount++;
        if (!existing) Object.assign(next, {answerCount: Number(snapshot.data()?.answerCount || 0) + 1});
      } else next.counts[ballot!.optionId!] = (next.counts[ballot!.optionId!] || 0) + 1;
      const accepted: PollReceipt = {...ballot!, receivedAtMs: Date.now()};
      if (answerRef) tx.set(answerRef, answer!);
      if (invitation) tx.update(invitation, {used: true, voterKey});
      tx.create(ref.collection("ballots").doc(voterKey), accepted); tx.set(ref, next); return accepted;
    });
    res.status(200).json({receipt: {requestId: receipt.requestId, receivedAtMs: receipt.receivedAtMs}, serverNowMs: Date.now()});
  } catch (error) {
    handleError(res, error);
  }
}

/** Archive retention removes private ballots; deadlines are enforced without a scheduler. */
export const pollRetention = onSchedule("every 24 hours", async () => {
  const rounds = await db.collectionGroup("pollRounds").where("archivedAtMs", "<=", Date.now() - 90 * 86400000).limit(100).get();
  for (const d of rounds.docs) {
    if (d.data().state !== "archived" || d.data().purgedAtMs) continue;
    await Promise.all([db.recursiveDelete(d.ref.collection("ballots")), db.recursiveDelete(d.ref.collection("answers")), db.recursiveDelete(d.ref.collection("invitations"))]);
    await d.ref.update({purgedAtMs: Date.now(), archivedAtMs: FieldValue.delete()});
  }
});
export const pollsHandler = onRequest({cors: true, maxInstances: 5}, handlePolls);
export const pollFeedHandler = onRequest({cors: true, maxInstances: 10}, handlePollFeed);
export const pollParticipantHandler = onRequest({cors: false, maxInstances: 10}, handlePollParticipant);
