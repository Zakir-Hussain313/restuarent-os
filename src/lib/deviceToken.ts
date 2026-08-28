"use client";

const STORAGE_KEY = "zaiqa_device_token";

// Returns this browser's device token, creating and persisting one if it
// doesn't exist yet. Used to identify this physical device/browser across
// logins for the branch-device-approval clock-in/out system.
export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}