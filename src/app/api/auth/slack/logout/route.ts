import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type AppSession, sessionOptions } from "@/lib/session";

export async function POST() {
  try {
    const session = await getIronSession<AppSession>(
      await cookies(),
      sessionOptions,
    );

    session.destroy();
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ error: "logout_failed" }, { status: 500 });
  }
}
