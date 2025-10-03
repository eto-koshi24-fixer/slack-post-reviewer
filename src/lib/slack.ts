import { WebClient } from "@slack/web-api";

export function slackClient(userAccessToken: string) {
  return new WebClient(userAccessToken, {
    // optional: logLevel: LogLevel.DEBUG
  });
}
