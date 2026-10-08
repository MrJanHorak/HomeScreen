import {Timestamp} from "firebase-admin/firestore";
import * as crypto from "crypto";
import {assertAuthorizationVersion, auth, db, getAuthorizationVersion} from "../utils/db";
import {decryptToken, encryptToken} from "../utils/crypto";
import {ACTIVITY_SCOPES, INVITE_LIFETIME_MS, MAX_PEOPLE, invitationHash, personId} from "../utils/people";
import type {GoogleTokens} from "../types";

export interface ActivityShare {dashboardId: string; userId: string; name: string; dashboardName: string; revision: string}
export interface ActivityInvitation {dashboardId: string; dashboardName: string; authorizationVersion: number; expiresAtMs: number}
const shares = () => db.collection("activity_shares");
const connection = (uid: string) => db.collection("users").doc(uid).collection("activity").doc("connection");

export async function createActivityInvitation(dashboardId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const id = invitationHash(token);
  const expiresAtMs = Date.now() + INVITE_LIFETIME_MS;
  const name = (await auth.getUser(dashboardId)).displayName?.split(" ")[0] || "HomeScreen";
  const dashboardName = `${name.slice(0, 40)}’s dashboard`;
  const authorizationVersion = await getAuthorizationVersion(dashboardId);
  await db.runTransaction(async (tx) => {
    await assertAuthorizationVersion(tx, dashboardId, authorizationVersion);
    const members = await tx.get(shares().where("dashboardId", "==", dashboardId).limit(MAX_PEOPLE));
    if (members.size >= MAX_PEOPLE) throw new Error("This dashboard has reached its people limit.");
    tx.create(db.collection("activity_invitations").doc(id), {dashboardId, dashboardName,
      authorizationVersion, expiresAtMs, deleteAt: Timestamp.fromMillis(expiresAtMs)});
  });
  const url = new URL("/people", process.env.PAIRING_URL);
  url.searchParams.set("invite", token);
  return {url: url.toString(), expiresAtMs, id};
}

export async function readActivityInvitation(hash: string): Promise<ActivityInvitation> {
  const invite = (await db.collection("activity_invitations").doc(hash).get()).data() as ActivityInvitation | undefined;
  if (!invite || Date.now() >= invite.expiresAtMs ||
      await getAuthorizationVersion(invite.dashboardId) !== invite.authorizationVersion) {
    throw new Error("This invitation has expired or was cancelled. Ask for a new invitation.");
  }
  return invite;
}

/** Credential and membership writes commit together; disconnect/delete cancels in-flight consent. */
export async function saveActivityConsent(uid: string, tokens: GoogleTokens,
  version: number, authTimeSeconds: number,
  profile: {name: string; stepGoal: number; distanceGoal: number}, inviteHash?: string): Promise<void> {
  if (!tokens.refreshToken || !ACTIVITY_SCOPES.every((scope) => tokens.scope?.split(" ").includes(scope))) {
    throw new Error("Activity permissions were not granted.");
  }
  const revision = crypto.randomBytes(16).toString("hex");
  await db.runTransaction(async (tx) => {
    await assertAuthorizationVersion(tx, uid, version, authTimeSeconds);
    const ref = inviteHash ? db.collection("activity_invitations").doc(inviteHash) : null;
    const invite = ref ? (await tx.get(ref)).data() as ActivityInvitation | undefined : undefined;
    const outgoing = await tx.get(shares().where("userId", "==", uid).limit(MAX_PEOPLE));
    if (ref) {
      if (!invite || Date.now() >= invite.expiresAtMs || invite.dashboardId === uid) throw new Error("Invitation is unavailable.");
      await assertAuthorizationVersion(tx, invite.dashboardId, invite.authorizationVersion);
      const incoming = await tx.get(shares().where("dashboardId", "==", invite.dashboardId).limit(MAX_PEOPLE));
      const id = personId(invite.dashboardId, uid);
      if (incoming.docs.some((doc) => doc.id === id)) throw new Error("You are already sharing with this dashboard.");
      if (incoming.size >= MAX_PEOPLE || outgoing.size >= MAX_PEOPLE) throw new Error("The activity sharing limit has been reached.");
    }
    tx.set(connection(uid), {provider: "google-fit", ...profile, revision,
      google: {accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
        refreshToken: encryptToken(tokens.refreshToken!), expiryDate: tokens.expiryDate ?? null, scope: tokens.scope ?? ""}});
    for (const share of outgoing.docs) tx.update(share.ref, {name: profile.name, revision});
    // Credentials never belong to the dashboard owner and are never sent to a client.
    if (ref && invite) {
      tx.create(shares().doc(personId(invite.dashboardId, uid)), {
        dashboardId: invite.dashboardId, userId: uid, name: profile.name,
        dashboardName: invite.dashboardName, revision,
      } satisfies ActivityShare);
      tx.delete(ref);
    }
  });
}

export async function activityShares(field: "dashboardId" | "userId", uid: string) {
  return (await shares().where(field, "==", uid).limit(MAX_PEOPLE).get()).docs;
}

export async function removeActivityShare(id: string, uid: string, allowParticipant: boolean): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = shares().doc(id); const share = (await tx.get(ref)).data() as ActivityShare | undefined;
    if (!share || (share.dashboardId !== uid && !(allowParticipant && share.userId === uid))) {
      throw new Error("This activity share is unavailable.");
    }
    tx.delete(ref);
  });
}

export async function readActivityConnection(uid: string) {
  return (await connection(uid).get()).data();
}
export function activityTokens(data: {google?: {accessToken?: string; refreshToken?: string; scope?: string; expiryDate?: number}}): GoogleTokens {
  return {accessToken: data.google?.accessToken ? decryptToken(data.google.accessToken) : undefined,
    refreshToken: data.google?.refreshToken ? decryptToken(data.google.refreshToken) : undefined,
    scope: data.google?.scope, expiryDate: data.google?.expiryDate};
}

/** Privacy-sensitive removal is also called by account deletion. */
export async function clearActivitySharing(uid: string, includeOwnedDashboards = false): Promise<void> {
  for (const field of includeOwnedDashboards ? ["userId", "dashboardId"] as const : ["userId"] as const) {
    for (;;) {
      const docs = await activityShares(field, uid);
      if (!docs.length) break;
      const batch = db.batch(); docs.forEach((doc) => batch.delete(doc.ref)); await batch.commit();
    }
  }
  await db.recursiveDelete(db.collection("users").doc(uid).collection("activity"));
  if (includeOwnedDashboards) {
    for (;;) {
      const invites = await db.collection("activity_invitations").where("dashboardId", "==", uid).limit(100).get();
      if (invites.empty) break;
      const batch = db.batch(); invites.docs.forEach((doc) => batch.delete(doc.ref)); await batch.commit();
    }
  }
}
