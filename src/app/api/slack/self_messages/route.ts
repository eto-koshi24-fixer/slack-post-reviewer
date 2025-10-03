import dayjs from "dayjs";
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

  if (!session.slack?.userAccessToken) {
    return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  }

  const client = slackClient(session.slack.userAccessToken);

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    // 自分の user_id を取得
    const auth = await client.auth.test();
    if (!auth.ok) {
      return NextResponse.json({ error: "auth_failed" }, { status: 400 });
    }
    const selfUid = auth.user_id as string;

    // 🎯 効率的な実装: search.messagesで直接検索（1回のAPI呼び出し）
    let query: string;
    if (start === end) {
      // 同じ日付の場合は「on:」を使用
      query = `from:<@${selfUid}> on:${start}`;
    } else {
      // 範囲指定の場合は前日から翌日までで指定
      const adjustedStart = dayjs(start)
        .subtract(1, "day")
        .format("YYYY-MM-DD");
      const adjustedEnd = dayjs(end).add(1, "day").format("YYYY-MM-DD");
      query = `from:<@${selfUid}> after:${adjustedStart} before:${adjustedEnd}`;
    }
    console.log("🔍 Search query:", query);

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
      console.log(`📄 Fetching page ${page}...`);

      const searchResult = await client.search.messages({
        query,
        count: 100, // 1ページあたりの最大件数
        sort: "timestamp",
        page: page,
      });

      if (!searchResult.ok) {
        console.error("❌ Search failed:", searchResult.error);
        return NextResponse.json(
          { error: searchResult.error },
          { status: 400 },
        );
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

      // 総ページ数を算出
      const total = searchResult.messages?.total || 0;
      totalPages = Math.ceil(total / 100);

      console.log(
        `📅 Page ${page}/${totalPages}: ${matches.length} messages (total so far: ${allMatches.length}/${total})`,
      );

      page++;

      // 安全のための上限設定（100ページ=10,000件まで）
      if (page > 100) {
        console.warn("⚠️ Reached maximum page limit (100 pages)");
        break;
      }
    } while (page <= totalPages);

    console.log("✅ Final result:", {
      totalMatches: allMatches.length,
      totalPages: totalPages,
    });

    const matches = allMatches;

    // チャンネル別にグループ化（タイプ情報をチャンネルレベルに）
    const groupedMessages: {
      [channel: string]: {
        channelType: string;
        messages: { date: string; message: string }[];
      };
    } = {};

    // DM相手のユーザー名を取得する関数
    const getDMUserName = async (channelId: string): Promise<string> => {
      try {
        // conversations.infoでDMチャンネルの詳細を取得
        const channelInfo = await client.conversations.info({
          channel: channelId,
        });
        if (
          channelInfo.ok &&
          channelInfo.channel &&
          "user" in channelInfo.channel
        ) {
          // users.infoで相手のユーザー情報を取得
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
      } catch (error) {
        console.warn("Failed to get DM user name:", error);
        return `DM (${channelId.slice(0, 8)}...)`;
      }
    };

    // グループDM参加者のユーザー名を取得する関数
    const getGroupDMUserNames = async (channelId: string): Promise<string> => {
      try {
        // conversations.members APIでメンバーを取得
        const membersInfo = await client.conversations.members({
          channel: channelId,
        });

        if (membersInfo.ok && membersInfo.members) {
          // 自分以外のメンバーを取得
          const otherMembers = membersInfo.members.filter(
            (memberId) => memberId !== selfUid,
          );

          // 各メンバーのユーザー名を取得
          const userNames: string[] = [];
          for (const memberId of otherMembers) {
            try {
              const userInfo = await client.users.info({ user: memberId });
              if (userInfo.ok && userInfo.user) {
                const userName =
                  userInfo.user.profile?.display_name ||
                  userInfo.user.real_name ||
                  userInfo.user.name ||
                  "Unknown User";
                userNames.push(userName);
              }
            } catch (error) {
              console.warn(`Failed to get user info for ${memberId}:`, error);
              userNames.push("Unknown User");
            }
          }

          return userNames.length > 0
            ? userNames.join(", ")
            : `グループDM (${channelId.slice(0, 8)}...)`;
        }

        return `グループDM (${channelId.slice(0, 8)}...)`;
      } catch (error) {
        console.warn("Failed to get group DM user names:", error);
        return `グループDM (${channelId.slice(0, 8)}...)`;
      }
    };

    // チャンネルタイプを判別する関数（非同期版）
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
        return {
          name: userNames,
          type: "group_dm",
        };
      }
      if (channel.name) {
        return {
          name: channel.name,
          type: channel.is_private ? "private_channel" : "public_channel",
        };
      }

      // フォールバック
      return { name: channel.id, type: "unknown" };
    };

    // 非同期でメッセージを処理
    for (const message of matches) {
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

      const { name: channelName, type: channelType } =
        await getChannelTypeAndName(message.channel || {});

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

    // 各チャンネル内で日付順にソート（古い順）
    Object.keys(groupedMessages).forEach((channel) => {
      groupedMessages[channel].messages.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    return NextResponse.json(groupedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "failed_to_fetch_messages" },
      { status: 500 },
    );
  }
}
