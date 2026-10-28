import { NextRequest } from "next/server";

export const ESP32_API_KEY = process.env.ESP32_API_KEY || "pharmalink_esp32_secret_key_2026";

export function validateApiKey(request: NextRequest): boolean {
  const headerKey = request.headers.get("x-api-key");
  const authHeader = request.headers.get("authorization");

  if (headerKey && headerKey === ESP32_API_KEY) {
    return true;
  }

  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (bearer === ESP32_API_KEY) return true;
  }

  // Also check URL search param as fallback for easy browser / ESP testing
  const url = new URL(request.url);
  if (url.searchParams.get("apiKey") === ESP32_API_KEY) {
    return true;
  }

  return false;
}

