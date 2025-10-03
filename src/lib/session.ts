import type { SessionOptions } from "iron-session";

if (!process.env.IRON_SESSION_PASSWORD) {
  throw new Error("IRON_SESSION_PASSWORD environment variable is required");
}

export const sessionOptions: SessionOptions = {
  cookieName: "slack_local_app",
  password: process.env.IRON_SESSION_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export type AppSession = {
  slack?: {
    userAccessToken: string;
    authedUserId: string;
    teamId?: string;
    userName?: string;
    userAvatar?: string;
    teamName?: string;
    userEmail?: string;
  };
};
