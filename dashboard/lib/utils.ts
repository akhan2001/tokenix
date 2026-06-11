/**
 * Utility functions for data formatting and manipulation
 */

export const formatPrice = (n: number): string => {
  if (n === 0) return "free";
  if (n < 0.01) return "$" + n.toFixed(4);
  if (n < 1) return "$" + n.toFixed(3);
  return "$" + n.toFixed(2);
};

export const formatLargeNumber = (n: number): string => {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

export const getTierClass = (tier: string): string => {
  const tierMap: Record<string, string> = {
    S: "tb-S",
    A: "tb-A",
    B: "tb-B",
    C: "tb-C",
  };
  return tierMap[tier] || "";
};

export const getTierLabel = (tier: string): string => {
  const tierMap: Record<string, string> = {
    S: "Frontier",
    A: "Flagship",
    B: "Workhorse",
    C: "Specialised",
  };
  return tierMap[tier] || tier;
};

export const getTierFromPrice = (input: number): "S" | "A" | "B" | "C" => {
  if (input >= 10) return "S";
  if (input >= 1) return "A";
  if (input >= 0.1) return "B";
  return "C";
};

export const calculateTotalPages = (total: number, pageSize: number): number => {
  return Math.ceil(total / pageSize);
};

export const getChangeColor = (change: number): "up" | "dn" | "fl" => {
  if (change < 0) return "dn";
  if (change > 0) return "up";
  return "fl";
};

export const formatChangePercent = (change: number): string => {
  if (change === 0) return "—";
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
};

export const filterModels = (
  models: Array<any>,
  search: string,
  provider: string,
  tier: string
): Array<any> => {
  return models.filter((m) => {
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase());
    const matchProvider = provider === "all" || m.provider === provider;
    const matchTier = tier === "all" || m.tier === tier;
    return matchSearch && matchProvider && matchTier;
  });
};

export const sortModels = (
  models: Array<any>,
  sortKey: string,
  sortDir: "asc" | "desc"
): Array<any> => {
  return [...models].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (typeof aVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });
};

export const paginateArray = <T,>(
  arr: T[],
  pageSize: number,
  pageNumber: number
): { items: T[]; pagination: { current: number; total: number; start: number; end: number } } => {
  const total = Math.ceil(arr.length / pageSize);
  const current = Math.max(1, Math.min(total, pageNumber));
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, arr.length);
  const items = arr.slice(start, end);

  return {
    items,
    pagination: { current, total, start, end },
  };
};
