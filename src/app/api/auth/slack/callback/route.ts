import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { type AppSession, sessionOptions } from "@/lib/session";
import { slackClient } from "@/lib/slack";

export async function GET(request: NextRequest) {
  const session = await getIronSession<AppSession>(
    await cookies(),
    sessionOptions,
  );

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("slack_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.json(
      { error: "invalid_state_or_code" },
      { status: 400 },
    );
  }

  if (
    !process.env.SLACK_CLIENT_ID ||
    !process.env.SLACK_CLIENT_SECRET ||
    !process.env.SLACK_REDIRECT_URI
  ) {
    return NextResponse.json({ error: "missing_env_vars" }, { status: 500 });
  }

  const body = new URLSearchParams({
    code: code,
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: process.env.SLACK_REDIRECT_URI,
  });

  try {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json();
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error ?? "oauth_failed" },
        { status: 400 },
      );
    }

    const userAccessToken = data.authed_user?.access_token as string;
    const authedUserId = data.authed_user?.id as string;
    const teamId = data.team?.id as string | undefined;

    if (!userAccessToken) {
      return NextResponse.json({ error: "no_user_token" }, { status: 400 });
    }

    // ユーザー情報を取得
    const client = slackClient(userAccessToken);
    let userName = "Unknown User";
    let userAvatar = "";
    let teamName = "";
    let userEmail = "";

    try {
      // ユーザー情報取得
      const userInfo = await client.users.info({ user: authedUserId });
      if (userInfo.ok && userInfo.user) {
        userName =
          userInfo.user.profile?.display_name ||
          userInfo.user.real_name ||
          userInfo.user.name ||
          "Unknown User";
        userAvatar =
          userInfo.user.profile?.image_72 ||
          userInfo.user.profile?.image_48 ||
          "";
        userEmail = userInfo.user.profile?.email || "";
      }

      // チーム情報取得
      if (teamId) {
        const teamInfo = await client.team.info({ team: teamId });
        if (teamInfo.ok && teamInfo.team) {
          teamName = teamInfo.team.name || "";
        }
      }
    } catch (error) {
      console.warn("Failed to fetch user info:", error);
    }

    session.slack = {
      userAccessToken,
      authedUserId,
      teamId,
      userName,
      userAvatar,
      teamName,
      userEmail,
    };
    await session.save();

    return NextResponse.redirect(new URL("/", request.url));
  } catch (_error) {
    return NextResponse.json(
      { error: "authentication_failed" },
      { status: 500 },
    );
  }
}
