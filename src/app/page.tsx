"use client";

import {
  mdiAccount,
  mdiAccountGroup,
  mdiAlert,
  mdiCancel,
  mdiChartBar,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiCloudDownload,
  mdiCodeJson,
  mdiEmailOutline,
  mdiEmoticonHappyOutline,
  mdiLogin,
  mdiLogout,
  mdiMusicAccidentalSharp,
  mdiPaperclip,
} from "@mdi/js";
import Icon from "@mdi/react";
import dayjs from "dayjs";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type GroupedMessages = {
  [channel: string]: {
    channelType: string;
    messages: {
      date: string;
      message: string;
    }[];
  };
};

type UserInfo = {
  name: string;
  avatar: string;
  teamName: string;
  email: string;
};

export default function Home() {
  const [start, setStart] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [end, setEnd] = useState(dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState<GroupedMessages | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<{
    [channelName: string]: boolean;
  }>({});
  const [messageTypes, setMessageTypes] = useState<{
    channel: boolean;
    group_dm: boolean;
    dm: boolean;
  }>({ channel: true, group_dm: true, dm: true });

  // 年月指定モード用のstate
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // dayjsは0-indexなので+1
  const [isDetailedMode, setIsDetailedMode] = useState(false);

  // 月のラベル
  const monthLabels = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  // ログイン状態とユーザー情報確認関数
  const checkLoginStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/user");
      if (r.ok) {
        const data = await r.json();
        setLoggedIn(true);
        setUserInfo(data.user);
      } else {
        setLoggedIn(false);
        setUserInfo(null);
      }
    } catch {
      setLoggedIn(false);
      setUserInfo(null);
    }
  }, []);

  // ページ読み込み時とOAuth完了後の確認
  useEffect(() => {
    // 常にログイン状態を確認（軽いAPI）
    checkLoginStatus();
  }, [checkLoginStatus]);

  const onLogin = () => {
    window.location.href = "/api/auth/slack/login";
  };
  const onLogout = async () => {
    await fetch("/api/auth/slack/logout", { method: "POST" });
    setLoggedIn(false);
    setUserInfo(null);
    setData(null);
  };

  const onFetch = async () => {
    setLoading(true);
    setData(null);
    setLoadingStatus("接続中...");

    try {
      // メッセージタイプのパラメータを作成
      const selectedTypes = Object.entries(messageTypes)
        .filter(([_, isSelected]) => isSelected)
        .map(([type]) => type)
        .join(",");

      // 日付パラメータの作成
      let startParam: string, endParam: string;
      if (isDetailedMode) {
        // 詳細モードの場合は既存の日付を使用
        startParam = start;
        endParam = end;
      } else {
        // 年月モードの場合は月の始まりから終わりまで
        const startOfMonth = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .startOf("month");
        const endOfMonth = dayjs()
          .year(selectedYear)
          .month(selectedMonth - 1)
          .endOf("month");
        startParam = startOfMonth.format("YYYY-MM-DD");
        endParam = endOfMonth.format("YYYY-MM-DD");
        setStart(startParam);
        setEnd(endParam);
      }

      const eventSource = new EventSource(
        `/api/slack/self_messages_sse?start=${startParam}&end=${endParam}&types=${selectedTypes}`
      );

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.progress) {
            setLoadingStatus(data.progress);
          }

          if (data.complete && data.data) {
            setData(data.data);
            setLoadingStatus("完了");
            eventSource.close();
            setTimeout(() => {
              setLoading(false);
              setLoadingStatus("");
            }, 500);
          }
        } catch (parseError) {
          console.error("Failed to parse SSE data:", parseError);
        }
      };

      eventSource.onerror = error => {
        console.error("SSE Error:", error);
        eventSource.close();
        setLoading(false);
        setLoadingStatus("");
        alert("取得に失敗しました。ログイン状態と日付を確認してください。");
      };

      // クリーンアップ関数を設定（コンポーネントがアンマウントされた時など）
      const cleanup = () => {
        eventSource.close();
        setLoading(false);
        setLoadingStatus("");
      };

      // タイムアウト設定（10分）
      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          cleanup();
          alert("処理がタイムアウトしました。もう一度お試しください。");
        }
      }, 600000);
    } catch (_e) {
      setLoading(false);
      setLoadingStatus("");
      alert("取得に失敗しました。ログイン状態と日付を確認してください。");
    }
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `self-messages_${start}_${end}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // チャンネルタイプでアイコンを返す
  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case "dm":
        return mdiEmailOutline;
      case "group_dm":
        return mdiAccountGroup;
      default:
        return mdiMusicAccidentalSharp;
    }
  };

  // チャンネルタイプの優先度を返す関数
  const getChannelTypePriority = (channelType: string) => {
    switch (channelType) {
      case "public_channel":
      case "private_channel":
        return 1; // チャンネルが最優先
      case "group_dm":
        return 2; // グループDMが2番目
      case "dm":
        return 3; // DMが最後
      default:
        return 4; // 不明なタイプは最後の最後
    }
  };

  // メンション・リンク・絵文字形式をバッジに変換する関数
  const parseMessageWithMentionsAndLinks = (text: string) => {
    const parts: Array<{
      type: "text" | "mention" | "link" | "emoji";
      content: string;
      username?: string;
      linkUrl?: string;
      linkText?: string;
      emojiName?: string;
      id: string;
    }> = [];

    // メンション、リンク（パイプあり）、リンク（パイプなし）、絵文字の順でマッチング
    const combinedRegex =
      /(<@([^|>]+)\|([^>]+)>)|(<(https:\/\/[^|>]+)\|([^>]+)>)|(<(https:\/\/[^>]+)>)|(:([a-z0-9_+-]+):)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null = combinedRegex.exec(text);

    while (match !== null) {
      // マッチする前のテキスト部分を追加
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
          id: `text-${lastIndex}-${match.index}`,
        });
      }

      if (match[1]) {
        // メンション部分: <@U123|username>
        parts.push({
          type: "mention",
          content: match[1],
          username: match[3],
          id: `mention-${match[2]}-${match.index}`,
        });
      } else if (match[4]) {
        // リンク部分（パイプあり）: <https://url|text>
        parts.push({
          type: "link",
          content: match[4],
          linkUrl: match[5],
          linkText: match[6],
          id: `link-${match.index}`,
        });
      } else if (match[7]) {
        // リンク部分（パイプなし）: <https://url>
        const url = match[8];
        parts.push({
          type: "link",
          content: match[7],
          linkUrl: url,
          linkText: url, // パイプなしの場合はURLをそのまま表示テキストとして使用
          id: `link-${match.index}`,
        });
      } else if (match[9]) {
        // 絵文字部分: :emoji_name:
        parts.push({
          type: "emoji",
          content: match[9],
          emojiName: match[10],
          id: `emoji-${match[10]}-${match.index}`,
        });
      }

      lastIndex = match.index + match[0].length;
      match = combinedRegex.exec(text);
    }

    // 残りのテキスト部分を追加
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
        id: `text-${lastIndex}-end`,
      });
    }

    return parts;
  };

  return (
    <main className="h-screen flex flex-col items-center p-4 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Slackの任意期間の投稿を取得するアプリ
      </h1>

      {/* 2カラムレイアウト */}
      <div className="flex gap-6 flex-1  min-h-0">
        {/* 左側：操作パネル（400px固定） */}
        <div className="w-96 flex flex-col gap-4 h-full overflow-y-auto">
          {/* ユーザー情報カード */}
          {loggedIn && userInfo ? (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex items-center gap-3">
              <Image
                src={userInfo.avatar || "/default-avatar.png"}
                alt="ユーザーアバター"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full"
                onError={e => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/48x48?text=👤";
                }}
              />
              <div>
                <div className="font-semibold text-lg">{userInfo.name}</div>
                <div className="text-gray-600 text-sm">{userInfo.email}</div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <Icon path={mdiCancel} size={1.2} className="text-gray-600" />
              </div>
              <div>
                <div className="font-semibold text-lg">未ログイン</div>
                <div className="text-gray-600 text-sm">
                  Slackにログインしてください
                </div>
              </div>
            </div>
          )}

          {/* ログイン/ログアウトボタン */}
          {!loggedIn ? (
            <button
              type="button"
              onClick={onLogin}
              className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 hover:underline-offset-4 hover:underline hover:cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg flex items-center justify-center gap-2"
            >
              <Icon path={mdiLogin} size={1} />
              Slack にログイン
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-3 bg-red-700 text-white rounded-lg hover:bg-red-600 hover:underline-offset-4 hover:underline hover:cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed  font-medium flex items-center justify-center gap-2"
            >
              <Icon path={mdiLogout} size={1} />
              ログアウト
            </button>
          )}

          {!isDetailedMode ? (
            <>
              {/* 年指定 */}
              <div>
                <div className="block text-sm font-medium mb-2">年</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedYear(prev => prev - 1)}
                    className="h-[42px] px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:underline-offset-4 hover:underline hover:cursor-pointer transition-colors flex items-center justify-center"
                  >
                    <Icon path={mdiChevronLeft} size={0.8} />
                  </button>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={e =>
                      setSelectedYear(
                        parseInt(e.target.value, 10) || dayjs().year()
                      )
                    }
                    className="flex-1 h-[42px] px-3 border rounded-lg text-center font-medium"
                    min="2000"
                    max="2030"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedYear(prev => prev + 1)}
                    className="h-[42px] px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:underline-offset-4 hover:underline hover:cursor-pointer transition-colors flex items-center justify-center"
                  >
                    <Icon path={mdiChevronRight} size={0.8} />
                  </button>
                </div>
              </div>

              {/* 月選択 */}
              <div>
                <div className="block text-sm font-medium mb-2">月</div>
                <div className="grid grid-cols-4 gap-2">
                  {monthLabels.map((monthLabel, index) => {
                    const monthNumber = index + 1;
                    return (
                      <button
                        key={monthNumber}
                        type="button"
                        onClick={() => setSelectedMonth(monthNumber)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:cursor-pointer ${
                          selectedMonth === monthNumber
                            ? "bg-blue-900 text-white hover:underline-offset-4 hover:underline"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:underline-offset-4 hover:underline"
                        }`}
                      >
                        {monthLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 開始日 */}
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium mb-1"
                >
                  開始日
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* 終了日 */}
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium mb-1"
                >
                  終了日
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}

          {/* 詳細指定チェックボックス */}
          <div>
            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:underline-offset-4 hover:underline px-2 py-1 rounded transition-colors border-none bg-transparent"
              onClick={() => setIsDetailedMode(!isDetailedMode)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsDetailedMode(!isDetailedMode);
                }
              }}
              aria-pressed={isDetailedMode}
              aria-label="期間を詳細に指定"
            >
              <Icon
                path={
                  isDetailedMode ? mdiCheckboxMarked : mdiCheckboxBlankOutline
                }
                size={0.8}
                className={isDetailedMode ? "text-blue-900" : "text-gray-500"}
              />
              <span className="text-sm font-medium text-black">
                期間を詳細に指定
              </span>
            </button>
          </div>

          {/* メッセージタイプ選択 */}
          <div>
            <div className="block text-sm font-medium mb-2">
              取得するメッセージタイプ
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:underline-offset-4 hover:underline px-2 py-1 rounded transition-colors border-none bg-transparent"
                onClick={() =>
                  setMessageTypes(prev => ({
                    ...prev,
                    channel: !prev.channel,
                  }))
                }
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMessageTypes(prev => ({
                      ...prev,
                      channel: !prev.channel,
                    }));
                  }
                }}
                aria-pressed={messageTypes.channel}
                aria-label="チャンネルメッセージを取得"
              >
                <Icon
                  path={
                    messageTypes.channel
                      ? mdiCheckboxMarked
                      : mdiCheckboxBlankOutline
                  }
                  size={0.8}
                  className={
                    messageTypes.channel ? "text-blue-900" : "text-gray-500"
                  }
                />
                <span className="text-sm font-medium text-black">
                  チャンネル
                </span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:underline-offset-4 hover:underline px-2 py-1 rounded transition-colors border-none bg-transparent"
                onClick={() =>
                  setMessageTypes(prev => ({
                    ...prev,
                    group_dm: !prev.group_dm,
                  }))
                }
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMessageTypes(prev => ({
                      ...prev,
                      group_dm: !prev.group_dm,
                    }));
                  }
                }}
                aria-pressed={messageTypes.group_dm}
                aria-label="グループDMメッセージを取得"
              >
                <Icon
                  path={
                    messageTypes.group_dm
                      ? mdiCheckboxMarked
                      : mdiCheckboxBlankOutline
                  }
                  size={0.8}
                  className={
                    messageTypes.group_dm ? "text-blue-900" : "text-gray-500"
                  }
                />
                <span className="text-sm font-medium text-black">
                  グループDM
                </span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:underline-offset-4 hover:underline px-2 py-1 rounded transition-colors border-none bg-transparent"
                onClick={() =>
                  setMessageTypes(prev => ({ ...prev, dm: !prev.dm }))
                }
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMessageTypes(prev => ({ ...prev, dm: !prev.dm }));
                  }
                }}
                aria-pressed={messageTypes.dm}
                aria-label="DMメッセージを取得"
              >
                <Icon
                  path={
                    messageTypes.dm
                      ? mdiCheckboxMarked
                      : mdiCheckboxBlankOutline
                  }
                  size={0.8}
                  className={
                    messageTypes.dm ? "text-blue-900" : "text-gray-500"
                  }
                />
                <span className="text-sm font-medium text-black">DM</span>
              </button>
            </div>
          </div>

          {/* 投稿取得ボタン */}
          <button
            type="button"
            onClick={onFetch}
            disabled={!loggedIn || loading}
            className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 hover:underline-offset-4 hover:underline hover:cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg flex items-center justify-center gap-2"
          >
            <Icon
              path={mdiCloudDownload}
              size={1}
              className={loading ? "animate-bounce" : ""}
            />
            {loading ? "取得中..." : "投稿を取得"}
          </button>

          {/* JSONダウンロードボタン */}
          <button
            type="button"
            onClick={downloadJSON}
            disabled={!data}
            className="w-full py-3 px-4 border-2 border-blue-900 text-blue-900 bg-white rounded-lg hover:bg-blue-50 hover:underline-offset-4 hover:underline hover:cursor-pointer disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            <Icon path={mdiCodeJson} size={1} />
            JSON をダウンロード
          </button>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <Icon path={mdiAlert} size={0.8} className="text-yellow-600" />
              注意事項
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>
                <strong>処理速度</strong>: 約100件あたり20秒程度かかります
              </li>
              <li>
                <strong>タイムアウト時間</strong>: 10分でタイムアウトします
              </li>
            </ul>
          </div>
        </div>

        {/* 右側：取得結果表示エリア */}
        <div className="w-[800px] h-full">
          {loading ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 h-full flex items-center justify-center">
              <div className="text-center text-blue-800">
                <div className="flex justify-center mb-6">
                  <Icon
                    path={mdiCloudDownload}
                    size={3}
                    className="text-blue-500 animate-bounce"
                  />
                </div>
                <div className="font-mono text-lg mb-3 px-4 py-2">
                  {loadingStatus}
                </div>
              </div>
            </div>
          ) : data ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 h-full flex flex-col">
              <div className="flex-shrink-0">
                <h2 className="text-xl font-semibold mb-4">集計結果</h2>
                <p className="mb-4">
                  期間:{" "}
                  {isDetailedMode
                    ? `${start} 〜 ${end}`
                    : `${selectedYear}年${selectedMonth}月`}{" "}
                  / 総件数:{" "}
                  <span className="font-bold">
                    {Object.values(data).reduce(
                      (total, channel) => total + channel.messages.length,
                      0
                    )}
                  </span>
                </p>
              </div>
              {/* チャンネル別ドロップダウン */}
              <div className="space-y-3 flex-1 overflow-y-auto scrollbar-common">
                {Object.entries(data)
                  .sort(([, channelA], [, channelB]) => {
                    // まずチャンネルタイプで比較
                    const priorityA = getChannelTypePriority(
                      channelA.channelType
                    );
                    const priorityB = getChannelTypePriority(
                      channelB.channelType
                    );

                    if (priorityA !== priorityB) {
                      return priorityA - priorityB;
                    }

                    // 同じタイプの場合はメッセージ数でソート（多い順）
                    return channelB.messages.length - channelA.messages.length;
                  })
                  .map(([channelName, channel]) => (
                    <details
                      key={channelName}
                      className="border border-gray-300 rounded-lg"
                      onToggle={e => {
                        const target = e.target as HTMLDetailsElement;
                        if (target) {
                          setOpenDropdowns(prev => ({
                            ...prev,
                            [channelName]: target.open,
                          }));
                        }
                      }}
                    >
                      <summary className="cursor-pointer p-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium flex justify-between items-center">
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon
                            path={getChannelIcon(channel.channelType)}
                            size={0.8}
                            className="text-gray-600 flex-shrink-0"
                          />
                          <span className="break-words">{channelName}</span>
                        </span>
                        <Icon
                          path={mdiChevronDown}
                          size={0.8}
                          className={`text-gray-600 transition-transform duration-200 ${
                            openDropdowns[channelName]
                              ? "rotate-180"
                              : "rotate-0"
                          }`}
                        />
                      </summary>
                      <div className="p-4 space-y-3 bg-white">
                        {channel.messages.map((message, index) => (
                          <div
                            key={`${message.date}-${index}`}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <div className="text-gray-900 text-base mb-2 whitespace-pre-wrap break-words">
                              {parseMessageWithMentionsAndLinks(
                                message.message
                              ).map(part => {
                                if (part.type === "mention" && part.username) {
                                  return (
                                    <span
                                      key={part.id}
                                      className="inline-flex items-center gap-1 px-1 py-[2px] mx-1 text-xs font-medium bg-blue-100 text-blue-500 rounded-sm border border-blue-200"
                                    >
                                      <Icon path={mdiAccount} size={0.5} />
                                      {part.username}
                                    </span>
                                  );
                                }
                                if (
                                  part.type === "link" &&
                                  part.linkText &&
                                  part.linkUrl
                                ) {
                                  return (
                                    <a
                                      key={part.id}
                                      href={part.linkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-1 py-[2px] mx-1 text-xs font-medium bg-green-100 text-green-700 rounded-sm border border-green-200 hover:bg-green-200 transition-colors max-w-xs truncate"
                                      title={part.linkText}
                                    >
                                      <Icon path={mdiPaperclip} size={0.5} />
                                      <span className="truncate">
                                        {part.linkText}
                                      </span>
                                    </a>
                                  );
                                }
                                if (part.type === "emoji" && part.emojiName) {
                                  return (
                                    <span
                                      key={part.id}
                                      className="inline-flex items-center gap-1 px-1 py-[2px] mx-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-sm border border-yellow-200"
                                      title={`:${part.emojiName}:`}
                                    >
                                      <Icon
                                        path={mdiEmoticonHappyOutline}
                                        size={0.5}
                                      />
                                      {part.emojiName}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={part.id}>{part.content}</span>
                                );
                              })}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {message.date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="flex justify-center mb-4">
                  <Icon path={mdiChartBar} size={3} className="text-gray-400" />
                </div>
                <div className="font-medium">取得結果がここに表示されます</div>
                <div className="text-sm">
                  日付を選択して「投稿を取得」をクリックしてください
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
