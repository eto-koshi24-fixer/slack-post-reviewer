import { NextResponse } from "next/server";

function randomState(len = 24) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export async function GET() {
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_REDIRECT_URI) {
    return NextResponse.json({ error: "missing_env_vars" }, { status: 500 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const state = randomState();

  const userScopes = [
    "channels:read",
    "groups:read",
    "im:read",
    "mpim:read",
    "channels:history",
    "groups:history",
    "im:history",
    "mpim:history",
    "search:read",
  ].join(",");

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("user_scope", userScopes);
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("slack_oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
