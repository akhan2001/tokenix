/**
 * Core data types for the Tokenix dashboard with dynamic properties
 */

export interface Model {
  name: string;
  provider: string;
  tier: "S" | "A" | "B" | "C";
  context: string;
  input: number;
  output: number;
  chg: number;
}

export interface TickerItem {
  name: string;
  price: string;
  chg: string;
  dir: "up" | "dn" | "fl";
}

export interface StatItem {
  label: string;
  value: string | number;
  sub: string;
  cls?: "gold" | "green" | "blue" | "";
}

export interface ThemeConfig {
  bg: string;
  bg2: string;
  bg3: string;
  white: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  rule: string;
  rule2: string;
  gold: string;
  gold2: string;
  gold3: string;
  blue: string;
  blue2: string;
  blue3: string;
  green: string;
  red: string;
  serif: string;
  mono: string;
}

export interface DashboardConfig {
  title: string;
  description: string;
  indexValue: number;
  indexDate: string;
  deflation: number;
  deflationPeriod: string;
  cheapestModel: number;
  modelsTracked: number;
  providers: number;
  hardwareFloor: number;
  stats: StatItem[];
  models: Model[];
  tickerItems: TickerItem[];
}

export interface FilterState {
  search: string;
  provider: string;
  tier: "all" | "S" | "A" | "B" | "C";
  sortKey: keyof Pick<Model, "name" | "provider" | "context" | "input" | "output" | "chg">;
  sortDir: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}
