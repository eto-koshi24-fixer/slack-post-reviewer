import dayjs from "dayjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { type AppSession, sessionOptions } from "@/lib/session";
import { slackClient } from "@/lib/slack";

export async function GET(request: NextRequest) {
  const session = await getIronSession<AppSession>(
    await cookies(),
    sessionOptions,
  );

  if (!session.slack?.userAccessToken) {
    return new Response(
      `data: ${JSON.stringify({ error: "not_logged_in" })}\n\n`,
      {
        status: 401,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const typesParam = searchParams.get("types") || "channel,group_dm,dm";
  const selectedTypes = typesParam.split(",");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return new Response(
      `data: ${JSON.stringify({ error: "invalid_date" })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  }

  // SSEストリームの設定
  const encoder = new TextEncoder();
  const userAccessToken = session.slack.userAccessToken;
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const sendProgress = (message: string, data?: unknown) => {
            const payload = data
              ? { progress: message, data }
              : { progress: message };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
          };

          const client = slackClient(userAccessToken);

          // 認証確認
          sendProgress("認証確認中...");
          const auth = await client.auth.test();
          if (!auth.ok) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "auth_failed" })}\n\n`,
              ),
            );
            controller.close();
            return;
          }
          const selfUid = auth.user_id as string;

          // クエリ構築
          let query: string;
          if (start === end) {
            query = `from:<@${selfUid}> on:${start}`;
          } else {
            const adjustedStart = dayjs(start)
              .subtract(1, "day")
              .format("YYYY-MM-DD");
            const adjustedEnd = dayjs(end).add(1, "day").format("YYYY-MM-DD");
            query = `from:<@${selfUid}> after:${adjustedStart} before:${adjustedEnd}`;
          }

          sendProgress("検索クエリ準備完了", { query });

          // 選択されたメッセージタイプを表示
          const typeLabels = selectedTypes.map((type) => {
            switch (type) {
              case "channel":
                return "チャンネル";
              case "group_dm":
                return "グループDM";
              case "dm":
                return "DM";
              default:
                return type;
            }
          });
          sendProgress(`取得対象: ${typeLabels.join("、")}`);

          // ページネーションで全件取得
          const allMatches: Array<{
            ts: string;
            text?: string;
            channel?: {
              name?: string;
              id?: string;
              is_im?: boolean;
              is_mpim?: boolean;
              is_private?: boolean;
            };
          }> = [];
          let page = 1;
          let totalPages = 1;

          do {
            sendProgress(`ページ取得中...`);

            const searchResult = await client.search.messages({
              query,
              count: 100,
              sort: "timestamp",
              page: page,
            });

            if (!searchResult.ok) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: searchResult.error })}\n\n`,
                ),
              );
              controller.close();
              return;
            }

            const matches = searchResult.messages?.matches || [];
            const validMatches = matches.filter((match) => match.ts) as Array<{
              ts: string;
              text?: string;
              channel?: {
                name?: string;
                id?: string;
                is_im?: boolean;
                is_mpim?: boolean;
                is_private?: boolean;
              };
            }>;
            allMatches.push(...validMatches);

            const total = searchResult.messages?.total || 0;
            totalPages = Math.ceil(total / 100);

            sendProgress(
              `ページ ${page}/${totalPages} 完了: ${matches.length}件 合計: ${allMatches.length}/${total}件`,
            );

            page++;

            if (page > 100) {
              sendProgress("最大ページ数に達しました");
              break;
            }
          } while (page <= totalPages);

          sendProgress(`全データ取得完了: ${allMatches.length}件`);

          // チャンネル別にグループ化
          sendProgress("チャンネル別グループ化開始...");
          const groupedMessages: {
            [channel: string]: {
              channelType: string;
              messages: { date: string; message: string }[];
            };
          } = {};

          // DM相手のユーザー名を取得する関数
          const getDMUserName = async (channelId: string): Promise<string> => {
            try {
              const channelInfo = await client.conversations.info({
                channel: channelId,
              });
              if (
                channelInfo.ok &&
                channelInfo.channel &&
                "user" in channelInfo.channel
              ) {
                const userInfo = await client.users.info({
                  user: (channelInfo.channel as { user: string }).user,
                });
                if (userInfo.ok && userInfo.user) {
                  return (
                    userInfo.user.profile?.display_name ||
                    userInfo.user.real_name ||
                    userInfo.user.name ||
                    "Unknown User"
                  );
                }
              }
              return `DM (${channelId.slice(0, 8)}...)`;
            } catch (_error) {
              return `DM (${channelId.slice(0, 8)}...)`;
            }
          };

          // グループDM参加者のユーザー名を取得する関数
          const getGroupDMUserNames = async (
            channelId: string,
          ): Promise<string> => {
            try {
              const membersInfo = await client.conversations.members({
                channel: channelId,
              });
              if (membersInfo.ok && membersInfo.members) {
                const otherMembers = membersInfo.members.filter(
                  (memberId) => memberId !== selfUid,
                );

                const userNames: string[] = [];
                for (const memberId of otherMembers) {
                  try {
                    const userInfo = await client.users.info({
                      user: memberId,
                    });
                    if (userInfo.ok && userInfo.user) {
                      const userName =
                        userInfo.user.profile?.display_name ||
                        userInfo.user.real_name ||
                        userInfo.user.name ||
                        "Unknown User";
                      userNames.push(userName);
                    }
                  } catch (_error) {
                    userNames.push("Unknown User");
                  }
                }

                return userNames.length > 0
                  ? userNames.join(", ")
                  : `グループDM (${channelId.slice(0, 8)}...)`;
              }
              return `グループDM (${channelId.slice(0, 8)}...)`;
            } catch (_error) {
              return `グループDM (${channelId.slice(0, 8)}...)`;
            }
          };

          // チャンネルタイプを判別する関数
          const getChannelTypeAndName = async (channel: {
            name?: string;
            id?: string;
            is_im?: boolean;
            is_mpim?: boolean;
            is_private?: boolean;
          }) => {
            if (!channel?.id) return { name: "unknown", type: "unknown" };

            if (channel.is_im) {
              const userName = await getDMUserName(channel.id);
              return { name: userName, type: "dm" };
            }
            if (channel.is_mpim) {
              const userNames = await getGroupDMUserNames(channel.id);
              return { name: userNames, type: "group_dm" };
            }
            if (channel.name) {
              return {
                name: channel.name,
                type: channel.is_private ? "private_channel" : "public_channel",
              };
            }

            return { name: channel.id, type: "unknown" };
          };

          // ユニークなチャンネル数を取得
          const _uniqueChannels = new Set(
            allMatches.map((m) => m.channel?.id).filter(Boolean),
          );
          let _processedChannels = 0;

          // メッセージタイプのフィルタリング用関数
          const isTypeSelected = (channelType: string): boolean => {
            if (channelType === "dm" && selectedTypes.includes("dm"))
              return true;
            if (
              channelType === "group_dm" &&
              selectedTypes.includes("group_dm")
            )
              return true;
            if (
              (channelType === "public_channel" ||
                channelType === "private_channel") &&
              selectedTypes.includes("channel")
            )
              return true;
            return false;
          };

          // 非同期でメッセージを処理
          for (const message of allMatches) {
            const timestamp = parseInt(message.ts, 10);
            const date = new Date(timestamp * 1000);
            const formattedDate = date.toLocaleString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            // チャンネル名解決が必要な場合の進捗表示
            if (!groupedMessages[message.channel?.id || "unknown"]) {
              _processedChannels++;
              if (message.channel?.is_im) {
                sendProgress(`DM相手のユーザー名解決中... `);
              } else if (message.channel?.is_mpim) {
                sendProgress(`グループDM参加者名解決中... `);
              }
            }

            const { name: channelName, type: channelType } =
              await getChannelTypeAndName(message.channel || {});

            // 選択されたメッセージタイプでない場合はスキップ
            if (!isTypeSelected(channelType)) {
              continue;
            }

            if (!groupedMessages[channelName]) {
              groupedMessages[channelName] = {
                channelType,
                messages: [],
              };
            }

            groupedMessages[channelName].messages.push({
              date: formattedDate,
              message: message.text || "",
            });
          }

          sendProgress("データ整形中...");
          // 各チャンネル内で日付順にソート（古い順）
          Object.keys(groupedMessages).forEach((channel) => {
            groupedMessages[channel].messages.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            );
          });

          const totalFilteredMessages = Object.values(groupedMessages).reduce(
            (total, channel) => total + channel.messages.length,
            0,
          );
          sendProgress(`処理完了: フィルタリング後 ${totalFilteredMessages}件`);

          // 最終結果を送信
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                complete: true,
                data: groupedMessages,
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error("Error in SSE stream:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "failed_to_fetch_messages",
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
