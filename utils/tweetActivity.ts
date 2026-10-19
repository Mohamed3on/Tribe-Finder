export type TweetDateEntry = { last_tweet: string | null; fetchedAt: string };
export type TweetDates = { [id: string]: TweetDateEntry };

const MS_DAY = 86_400_000;

// Infinity when unknown/never — so undated users sort as least-recently-active.
export const daysSinceTweet = (iso?: string | null): number =>
  iso ? (Date.now() - new Date(iso).getTime()) / MS_DAY : Infinity;

export const relativeTweetTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = daysSinceTweet(iso);
  if (d < 1) return 'today';
  if (d < 2) return 'yesterday';
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

// Green: active (<2mo). Amber: idling (2–6mo). Red: inactive (>6mo or never).
export const tweetActivityColor = (iso?: string | null): string => {
  const d = daysSinceTweet(iso);
  if (d > 180) return 'text-red-400';
  if (d > 60) return 'text-amber-400';
  return 'text-green-400';
};
