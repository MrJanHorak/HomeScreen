import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {db, runUserTransaction} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";

export function validAppPreferences(value: unknown): value is {visible: boolean; packages: string[]} {
  if (!value || typeof value !== "object") return false;
  const raw = value as {visible?: unknown; packages?: unknown};
  return typeof raw.visible === "boolean" && Array.isArray(raw.packages) && raw.packages.length <= 150 &&
    raw.packages.every((name) => typeof name === "string" && /^[a-zA-Z0-9_.]{1,180}$/.test(name)) &&
    new Set(raw.packages).size === raw.packages.length;
}
export async function handleDeviceApps(req: Request, res: Response): Promise<void> {
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
  const id = req.query.current === "1" && !identity.owner ? identity.deviceId : identity.owner ? req.query.id : null;
  if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id)) {
    res.status(403).json({error: "Choose a linked TV, or update and reconnect this TV"}); return;
  }
  const device = db.collection("users").doc(identity.userId).collection("devices").doc(id);
  const ref = device.collection("settings").doc("apps");
  try {
    const record = await device.get();
    if (!record.exists || record.data()?.revokedAtMs !== 0) {
      res.status(404).json({error: "TV is no longer linked"}); return;
    }
    if (req.method === "GET") {
      res.status(200).json((await ref.get()).data() || {apps: [], preferences: null, updatedAtMs: 0}); return;
    }
    if (JSON.stringify(req.body || {}).length > 50000) {
      res.status(400).json({error: "App settings are too large"}); return;
    }
    if (req.body?.apps !== undefined) {
      const apps = req.body.apps;
      if (identity.owner || !Array.isArray(apps) || apps.length > 150 || apps.some((app) =>
        !app || typeof app.packageName !== "string" || !/^[a-zA-Z0-9_.]{1,180}$/.test(app.packageName) ||
        typeof app.label !== "string" || !app.label.trim() || app.label.length > 80) ||
        !validAppPreferences(req.body.initialPreferences)) {
        res.status(400).json({error: "Only the TV can report its installed apps"}); return;
      }
      const data = await runUserTransaction(identity.userId, async (transaction) => {
        const current = (await transaction.get(ref)).data() || {};
        const record = await transaction.get(device);
        if (!record.exists || record.data()?.revokedAtMs !== 0) return null;
        const next = {...current, apps: apps.map((app: {packageName: string; label: string}) => ({packageName: app.packageName, label: app.label})),
          reportedAtMs: Date.now(), preferences: current.preferences || req.body.initialPreferences, updatedAtMs: current.updatedAtMs || 0};
        transaction.set(ref, next); return next;
      });
      res.status(data ? 200 : 404).json(data || {error: "TV is no longer linked"}); return;
    }
    if (!validAppPreferences(req.body?.preferences) || !Number.isSafeInteger(req.body?.expectedUpdatedAtMs) || req.body.expectedUpdatedAtMs < 0) {
      res.status(400).json({error: "Invalid favorite apps"}); return;
    }
    const result = await runUserTransaction(identity.userId, async (transaction) => {
      const current = (await transaction.get(ref)).data();
      const record = await transaction.get(device);
      if (!record.exists || record.data()?.revokedAtMs !== 0) return {status: 404, error: "TV is no longer linked"};
      if (!current) return {status: 409, error: "Open the updated app on this TV to sync installed apps first"};
      if (current.updatedAtMs !== req.body.expectedUpdatedAtMs) return {status: 409, error: "Favorite apps changed on another device. Reload this TV’s apps before saving."};
      const installed = new Set(current.apps.map((app: {packageName: string}) => app.packageName));
      if (req.body.preferences.packages.some((name: string) => !installed.has(name))) return {status: 400, error: "An app is no longer installed. Reload this TV’s apps."};
      const updatedAtMs = Math.max(Date.now(), current.updatedAtMs + 1);
      transaction.update(ref, {preferences: req.body.preferences, updatedAtMs});
      return {status: 200, updatedAtMs};
    });
    res.status(result.status).json(result);
  } catch (error) {
    logSafeError("Could not sync TV apps", error); res.status(500).json({error: "Could not sync TV apps"});
  }
}
export const deviceAppsHandler = onRequest({cors: true, maxInstances: 10}, handleDeviceApps);
