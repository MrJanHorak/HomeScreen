import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {db} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {validAppearance} from "./userAppearance";
import {AppearanceLibrary, emptyLibrary, MAX_DESIGNS, validDesignName, validRevision} from "./utils/appearanceLibrary";
import {randomUUID} from "crypto";

/** Private owner library. Only userAppearance publishes settings read by TVs. */
export async function handleAppearanceStudio(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (!["GET", "PUT"].includes(req.method)) {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Sign in with Google on the companion site to manage designs"}); return;
  }
  const collection = db.collection("users").doc(identity.userId).collection("appearance");
  const ref = collection.doc("studio");
  try {
    if (req.method === "GET") {
      const result = await db.runTransaction(async (transaction) => {
        const [library, settings, history] = await Promise.all([
          transaction.get(ref), transaction.get(collection.doc("settings")), transaction.get(collection.doc("history")),
        ]);
        return {
          library: library.data() || emptyLibrary(),
          appearance: settings.data()?.appearance || null,
          updatedAtMs: settings.data()?.updatedAtMs || 0,
          history: history.data()?.revisions || [],
        };
      });
      res.status(200).json(result); return;
    }
    const body = req.body || {};
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > 10_000 || !validRevision(body.expectedUpdatedAtMs)) {
      res.status(400).json({error: "Invalid design request or revision"}); return;
    }
    const action = body.action;
    if (!["draft", "saveDesign", "deleteDesign"].includes(action) ||
      (action === "draft" && body.draft !== null &&
        (!body.draft || !validRevision(body.draft.baseUpdatedAtMs) || !validAppearance(body.draft.appearance))) ||
      (action === "saveDesign" && (!validDesignName(body.name) || !validAppearance(body.appearance))) ||
      (body.id !== undefined && (typeof body.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.id))) ||
      (action === "deleteDesign" && !body.id)) {
      res.status(400).json({error: "Invalid draft or saved design"}); return;
    }
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const library = (snapshot.data() || emptyLibrary()) as AppearanceLibrary;
      if (body.expectedUpdatedAtMs !== library.updatedAtMs) return {error: "Designs changed in another browser. Use Refresh designs and history before retrying; your edits remain on this page.", status: 409};
      const designs = [...library.designs];
      let draft = library.draft;
      const updatedAtMs = Math.max(Date.now(), library.updatedAtMs + 1);
      if (action === "draft") draft = body.draft;
      else {
        const index = designs.findIndex((design) => design.id === body.id);
        if (body.id && index < 0) return {error: "Saved design no longer exists", status: 404};
        if (action === "deleteDesign") designs.splice(index, 1);
        else {
          if (index < 0 && designs.length >= MAX_DESIGNS) return {error: `Keep up to ${MAX_DESIGNS} designs. Delete one before adding another.`, status: 400};
          const design = {id: body.id || randomUUID(), name: body.name.trim(), appearance: body.appearance, updatedAtMs};
          if (index < 0) designs.push(design);
          else designs[index] = design;
        }
      }
      const next = {updatedAtMs, designs, draft};
      transaction.set(ref, next);
      return {library: next, status: 200};
    });
    res.status(result.status).json(result.error ? {error: result.error} : {library: result.library});
  } catch (error) {
    logSafeError("Could not sync design library", error);
    res.status(500).json({error: "Could not sync your drafts and designs"});
  }
}
export const appearanceStudioHandler = onRequest({cors: true, maxInstances: 5}, handleAppearanceStudio);
