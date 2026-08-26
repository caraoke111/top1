export interface CreatorLink {
  type: string;
  url: string;
}

export interface RankRow {
  id: string;
  rank: number;
  handle: string;
  name: string;
  bio: string;
  avatarUrl: string;
  country: string;
  category: string;
  verified: boolean;
  links: CreatorLink[];
  profileUrl: string;
  clicks: number;
  amountCents: number;
  priceToBeatCents: number;
  isKing: boolean;
}

export interface Widgets {
  mostClicked24h: {
    handle: string;
    name: string;
    avatarUrl: string;
    profileUrl: string;
    clicks: number;
  } | null;
  longestReign: {
    handle: string;
    name: string;
    avatarUrl: string;
    profileUrl: string;
    secs: number;
  } | null;
  biggestEgo: {
    handle: string;
    name: string;
    avatarUrl: string;
    profileUrl: string;
    amountCents: number;
  } | null;
  entryPriceCents: number;
}

export interface Stats {
  bidTodayCents: number;
  totalClicks: number;
  creators: number;
  totalRaisedCents: number;
}

export interface RankingResponse {
  ranking: RankRow[];
  widgets: Widgets;
  liveCount: number;
  stats: Stats;
}
