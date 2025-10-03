export type ChannelBucket = {
  channel: {
    id: string;
    name?: string | null;
    is_im?: boolean;
    is_mpim?: boolean;
    is_private?: boolean;
  };
  messages: Array<{
    ts: string;
    thread_ts?: string;
    text?: string;
    permalink?: string;
  }>;
};

export type SelfMessagesResponse = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  total: number;
  buckets: ChannelBucket[];
};
