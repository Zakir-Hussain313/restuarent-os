#!/usr/bin/env node
// Local sync bridge between a ZKTeco-class fingerprint scanner and Zaiqa's
// biometric-sync API. Runs on a machine on the scanner's local network
// (same one the scanner is plugged into/networked with), NOT in the app
// itself. Polls the scanner for attendance logs, tracks which ones have
// already been sent via a local state file, and POSTs new ones in batches.
//
// Usage:
//   node sync-fingerprint-attendance.mjs --config=sync-config.json --inspect
//     One-shot: connects, prints the first 5 raw attendance records exactly
//     as the device returns them, then exits. RUN THIS FIRST on the real
//     scanner before trusting anything else here — node-zklib's field
//     names for user id / timestamp aren't fully nailed down across
//     firmware versions, and there's a known upstream issue where
//     getAttendances() can return an inconsistent record count between
//     calls. Confirm the shape, then fix FIELD MAP below if needed.
//
//   node sync-fingerprint-attendance.mjs --config=sync-config.json --once
//     Single poll-and-sync cycle, then exit. Good for a first real test,
//     or for running via Windows Task Scheduler / cron instead of a
//     long-running process.
//
//   node sync-fingerprint-attendance.mjs --config=sync-config.json
//     Long-running: polls forever on the configured interval. Meant to be
//     kept alive with pm2 or a Windows service wrapper on the branch's
//     machine.

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import ZKLib from "node-zklib";

// ─── CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const configPath = (args.find((a) => a.startsWith("--config=")) ?? "").split("=")[1];
const isInspect = args.includes("--inspect");
const isOnce = args.includes("--once");

if (!configPath) {
  console.error("Usage: node sync-fingerprint-attendance.mjs --config=<path.json> [--inspect|--once]");
  process.exit(1);
}

const MAX_PUNCHES_PER_REQUEST = 500; // must match the API's own cap

// ─── Config ─────────────────────────────────────────────────────────────

async function loadConfig() {
  const raw = await readFile(configPath, "utf-8");
  const config = JSON.parse(raw);
  const required = ["scannerIp", "apiBaseUrl", "branchDeviceId", "syncSecret"];
  for (const key of required) {
    if (!config[key]) throw new Error(`Config is missing required field: ${key}`);
  }
  return {
    scannerIp: config.scannerIp,
    scannerPort: config.scannerPort ?? 4370,
    inPort: config.inPort ?? 4000,
    timeoutMs: config.timeoutMs ?? 10000,
    apiBaseUrl: config.apiBaseUrl.replace(/\/$/, ""),
    branchDeviceId: config.branchDeviceId,
    syncSecret: config.syncSecret,
    pollIntervalMs: config.pollIntervalMs ?? 30000,
    stateFilePath: config.stateFilePath ?? "./sync-state.json",
  };
}

// ─── Local sync state (what's already been sent) ───────────────────────
//
// A ZKTeco device keeps its own internal log indefinitely (until manually
// cleared) — every poll re-reads the FULL log, so we track the newest
// timestamp we've already synced and only send punches after it. State is
// persisted after every successfully-confirmed batch, not just at the end
// of a poll, so a mid-poll failure never re-sends what already succeeded.

async function loadState(stateFilePath) {
  if (!existsSync(stateFilePath)) return { lastSyncedMs: 0 };
  try {
    return JSON.parse(await readFile(stateFilePath, "utf-8"));
  } catch {
    console.warn(`Could not parse ${stateFilePath}, starting from scratch.`);
    return { lastSyncedMs: 0 };
  }
}

async function saveState(stateFilePath, state) {
  await writeFile(stateFilePath, JSON.stringify(state, null, 2));
}

// ─── Field mapping ──────────────────────────────────────────────────────
//
// UNVERIFIED against a real device as of writing — different node-zklib
// versions/firmwares have been seen with different field names for the
// same data. Run with --inspect on the real scanner first; if the mapped
// values below come out undefined, check the printed raw object and
// adjust the two lines marked below.

function extractPunch(record) {
  const externalUserId = record.deviceUserId ?? record.userId ?? record.uid ?? record.userSn; // ← adjust here if needed
  const rawTimestamp = record.recordTime ?? record.timestamp ?? record.record_time; // ← adjust here if needed
  if (externalUserId === undefined || rawTimestamp === undefined) return null;

  const timestamp = new Date(rawTimestamp);
  if (Number.isNaN(timestamp.getTime())) return null;

  return { externalUserId: String(externalUserId), timestamp: timestamp.toISOString() };
}

// ─── Device read ────────────────────────────────────────────────────────

async function readAttendanceLogs(config) {
  const zk = new ZKLib(config.scannerIp, config.scannerPort, config.timeoutMs, config.inPort);
  await zk.createSocket();
  try {
    const logs = await zk.getAttendances();
    return logs?.data ?? [];
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Already disconnected or device dropped the connection — not fatal.
    }
  }
}

// ─── API push ───────────────────────────────────────────────────────────

async function postBatch(config, punches) {
  const res = await fetch(`${config.apiBaseUrl}/api/attendance/biometric-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.syncSecret}`,
    },
    body: JSON.stringify({ branchDeviceId: config.branchDeviceId, punches }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sync request failed (${res.status}): ${body.error ?? "Unknown error"}`);
  }
  return body;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── One poll cycle ─────────────────────────────────────────────────────

async function runOnce(config) {
  const state = await loadState(config.stateFilePath);
  const rawRecords = await readAttendanceLogs(config);

  const punches = [];
  let skipped = 0;
  for (const record of rawRecords) {
    const punch = extractPunch(record);
    if (!punch) {
      skipped++;
      continue;
    }
    if (new Date(punch.timestamp).getTime() > state.lastSyncedMs) {
      punches.push(punch);
    }
  }
  if (skipped > 0) {
    console.warn(`${skipped} record(s) could not be read — check the field mapping (see --inspect).`);
  }

  punches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (punches.length === 0) {
    console.log(`[${new Date().toISOString()}] No new punches.`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Sending ${punches.length} new punch(es)...`);

  for (const batch of chunk(punches, MAX_PUNCHES_PER_REQUEST)) {
    const result = await postBatch(config, batch);
    const maxTimestampMs = Math.max(...batch.map((p) => new Date(p.timestamp).getTime()));
    state.lastSyncedMs = Math.max(state.lastSyncedMs, maxTimestampMs);
    await saveState(config.stateFilePath, state);

    const errors = (result.results ?? []).filter((r) => r.action === "error");
    if (errors.length > 0) {
      console.warn(`${errors.length} punch(es) in this batch were rejected (e.g. not enrolled):`, errors);
    }
  }

  console.log(`[${new Date().toISOString()}] Sync complete.`);
}

// ─── Inspect mode ───────────────────────────────────────────────────────

async function runInspect(config) {
  const rawRecords = await readAttendanceLogs(config);
  console.log(`Device returned ${rawRecords.length} total record(s). First 5, raw:`);
  console.log(JSON.stringify(rawRecords.slice(0, 5), null, 2));
  console.log(
    "\nCheck the field names above against extractPunch() in this script. " +
      "If deviceUserId/recordTime aren't present, update the two marked lines."
  );
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const config = await loadConfig();

  if (isInspect) {
    await runInspect(config);
    return;
  }

  if (isOnce) {
    await runOnce(config);
    return;
  }

  console.log(`Starting continuous sync, polling every ${config.pollIntervalMs}ms. Ctrl+C to stop.`);
  let stopped = false;
  process.on("SIGINT", () => {
    console.log("\nStopping...");
    stopped = true;
  });

  while (!stopped) {
    try {
      await runOnce(config);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Sync error (will retry next poll):`, err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});