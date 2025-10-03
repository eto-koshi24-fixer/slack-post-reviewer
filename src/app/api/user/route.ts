import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type AppSession, sessionOptions } from "@/lib/session";

export async function GET() {
  const session = await getIronSession<AppSession>(
    await cookies(),
    sessionOptions,
  );

  if (!session.slack?.userAccessToken) {
    return NextResponse.json(
      { error: "not_logged_in", loggedIn: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    loggedIn: true,
    user: {
      id: session.slack.authedUserId,
      name: session.slack.userName || "Unknown User",
      avatar: session.slack.userAvatar || "",
      teamName: session.slack.teamName || "",
      email: session.slack.userEmail || "",
    },
  });
}
