"use client";

import React, { useState, useMemo, ReactNode } from "react";
import type { Model, TickerItem, StatItem, FilterState, DashboardConfig } from "@/lib/types";
import {
  formatPrice,
  formatLargeNumber,
  getTierLabel,
  filterModels,
  sortModels,
  paginateArray,
  formatChangePercent,
  getChangeColor,
} from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface DashboardProps {
  config: DashboardConfig;
  onPageChange?: (page: number) => void;
}

interface PageProps {
  active: boolean;
  children: ReactNode;
}

// ─────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────

const Page: React.FC<PageProps> = ({ active, children }) => (
  <div style={{ display: active ? "block" : "none" }}>{children}</div>
);

interface TierBadgeProps {
  tier: "S" | "A" | "B" | "C";
}

const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const tierColors: Record<string, string> = {
    S: "#c8500a",
    A: "#2a4a8a",
    B: "#1a7a4a",
    C: "#7a7268",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: tierColors[tier],
        border: `1px solid ${tierColors[tier]}`,
        background: "transparent",
        borderRadius: 2,
        fontFamily: "var(--mono)",
      }}
    >
      {tier}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  indexValue: number;
  indexDate: string;
  deflation: number;
  deflationPeriod: string;
  onExploreClick: () => void;
  onMethodologyClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  indexValue,
  indexDate,
  deflation,
  deflationPeriod,
  onExploreClick,
  onMethodologyClick,
}) => (
  <section
    style={{
      padding: "100px 56px 80px",
      maxWidth: 1100,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 80,
      alignItems: "center",
      borderBottom: "1px solid var(--rule)",
    }}
  >
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--gold2)",
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        World&apos;s first · AI Compute Price Index
      </div>
      <h1
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(36px, 4.5vw, 60px)",
          fontWeight: 500,
          lineHeight: 1.12,
          letterSpacing: "-1px",
          color: "var(--ink)",
          marginBottom: 20,
        }}
      >
        The price of AI intelligence
        <br />— tracked, <em style={{ fontStyle: "italic", color: "var(--gold)" }}>daily</em>.
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink3)",
          lineHeight: 1.9,
          maxWidth: 380,
          marginBottom: 32,
        }}
      >
        Every AI provider charges differently. Every model performs differently. ACPI is the single quality-adjusted
        reference price that cuts through the noise — built from hardware economics, not marketing.
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          onClick={onExploreClick}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            borderBottom: "1px solid var(--ink)",
            paddingBottom: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--gold2)";
            (e.target as HTMLElement).style.borderColor = "var(--gold2)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--ink)";
            (e.target as HTMLElement).style.borderColor = "var(--ink)";
          }}
        >
          Explore the screener →
        </button>
        <button
          onClick={onMethodologyClick}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink4)",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--ink4)";
          }}
        >
          How it works
        </button>
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ink4)",
          marginBottom: 16,
        }}
      >
        ACPI · AI Compute Price Index
      </div>
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(72px, 10vw, 120px)",
          fontWeight: 400,
          lineHeight: 1,
          color: "var(--ink)",
          letterSpacing: "-3px",
          marginBottom: 12,
        }}
      >
        ${indexValue.toFixed(2)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink4)",
          letterSpacing: "0.08em",
          marginBottom: 20,
        }}
      >
        per 1M standard compute units
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--green)",
          fontWeight: 500,
        }}
      >
        ↓ {deflation.toFixed(1)}% deflation in {deflationPeriod}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink4)",
          marginTop: 8,
        }}
      >
        {indexDate}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────
// STATS ROW
// ─────────────────────────────────────────────────────────────────

interface StatsRowProps {
  stats: StatItem[];
}

const StatsRow: React.FC<StatsRowProps> = ({ stats }) => (
  <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--white)" }}>
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 56px",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
      }}
    >
      {stats.map((stat, idx) => (
        <div
          key={idx}
          style={{
            padding: "28px 0",
            borderRight: idx !== stats.length - 1 ? "1px solid var(--rule)" : "none",
          }}
        >
          <div style={{ padding: idx === 0 ? "0" : "0 20px" }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink4)",
                marginBottom: 10,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1,
                marginBottom: 4,
                color:
                  stat.cls === "gold"
                    ? "var(--gold2)"
                    : stat.cls === "green"
                      ? "var(--green)"
                      : stat.cls === "blue"
                        ? "var(--blue)"
                        : "var(--ink)",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink4)",
                lineHeight: 1.5,
              }}
            >
              {stat.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// SCREENER CONTROLS
// ─────────────────────────────────────────────────────────────────

interface ScreenerControlsProps {
  filters: FilterState;
  modelCount: number;
  providers: string[];
  onSearchChange: (search: string) => void;
  onProviderChange: (provider: string) => void;
  onTierChange: (tier: "all" | "S" | "A" | "B" | "C") => void;
}

const ScreenerControls: React.FC<ScreenerControlsProps> = ({
  filters,
  modelCount,
  providers,
  onSearchChange,
  onProviderChange,
  onTierChange,
}) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <input
        type="text"
        placeholder="Search models or providers..."
        value={filters.search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 220,
          background: "var(--white)",
          border: "1px solid var(--rule)",
          borderRadius: 4,
          color: "var(--ink)",
          fontFamily: "var(--mono)",
          fontSize: 12,
          padding: "9px 14px",
          outline: "none",
          transition: "border-color 0.15s",
        }}
      />
      <select
        value={filters.provider}
        onChange={(e) => onProviderChange(e.target.value)}
        style={{
          background: "var(--white)",
          border: "1px solid var(--rule)",
          borderRadius: 4,
          color: "var(--ink2)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          padding: "8px 12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="all">All providers</option>
        {providers.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 3 }}>
        {(["all", "S", "A", "B", "C"] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => onTierChange(tier)}
            style={{
              background: filters.tier === tier ? "var(--gold)" : "var(--white)",
              border: filters.tier === tier ? "1px solid var(--gold)" : "1px solid var(--rule)",
              borderRadius: 3,
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: filters.tier === tier ? "var(--white)" : "var(--ink4)",
              padding: "5px 10px",
              cursor: "pointer",
              transition: "all 0.15s",
              textTransform: "uppercase",
            }}
          >
            {tier === "all" ? "All tiers" : `${tier} — ${getTierLabel(tier)}`}
          </button>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink4)",
          marginLeft: "auto",
        }}
      >
        Showing {modelCount} models
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MODEL TABLE
// ─────────────────────────────────────────────────────────────────

interface ModelTableProps {
  models: Model[];
  pagination: any;
  sortState: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
  onPageChange: (page: number) => void;
}

const ModelTable: React.FC<ModelTableProps> = ({
  models,
  pagination,
  sortState,
  onSort,
  onPageChange,
}) => (
  <div style={{ background: "var(--white)", border: "1px solid var(--rule)" }}>
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "left",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            #
          </th>
          <th
            onClick={() => onSort("name")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "left",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Model {sortState.key === "name" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
          <th
            onClick={() => onSort("provider")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "left",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Provider {sortState.key === "provider" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
          <th
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "left",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Tier
          </th>
          <th
            onClick={() => onSort("context")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "right",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Context {sortState.key === "context" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
          <th
            onClick={() => onSort("input")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "right",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Input /1M {sortState.key === "input" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
          <th
            onClick={() => onSort("output")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "right",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            Output /1M {sortState.key === "output" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
          <th
            onClick={() => onSort("chg")}
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textAlign: "right",
              padding: "10px 16px",
              borderBottom: "2px solid var(--rule)",
              background: "var(--bg2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            1D chg {sortState.key === "chg" && (sortState.dir === "asc" ? "↑" : "↓")}
          </th>
        </tr>
      </thead>
      <tbody>
        {models.map((m, i) => {
          const changeColor = getChangeColor(m.chg);
          const changeClasses: Record<string, string> = {
            up: "cup",
            dn: "cdn",
            fl: "cfl",
          };
          return (
            <tr
              key={i}
              style={{
                ":hover": { background: "var(--bg)" },
              }}
            >
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                  color: "var(--ink4)",
                  width: 28,
                }}
              >
                {pagination.start + i + 1}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    color: "var(--ink)",
                    fontSize: 13,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink4)",
                    marginTop: 1,
                  }}
                >
                  {m.provider}
                </div>
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 10,
                  color: "var(--ink4)",
                }}
              >
                {m.provider}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                }}
              >
                <TierBadge tier={m.tier} />
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                  textAlign: "right",
                }}
              >
                {m.context || "—"}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                  textAlign: "right",
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {formatPrice(m.input)}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                  textAlign: "right",
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {formatPrice(m.output)}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 12,
                  textAlign: "right",
                  color:
                    changeColor === "cup"
                      ? "var(--red)"
                      : changeColor === "cdn"
                        ? "var(--green)"
                        : "var(--ink4)",
                }}
              >
                {formatChangePercent(m.chg)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderTop: "1px solid var(--rule)",
        background: "var(--bg2)",
      }}
    >
      <button
        onClick={() => onPageChange(pagination.current - 1)}
        disabled={pagination.current === 1}
        style={{
          background: "var(--white)",
          border: "1px solid var(--rule)",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: pagination.current === 1 ? "var(--ink3)" : "var(--ink)",
          padding: "6px 12px",
          cursor: pagination.current === 1 ? "default" : "pointer",
          transition: "all 0.15s",
          opacity: pagination.current === 1 ? 0.5 : 1,
        }}
      >
        ← Prev
      </button>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink4)",
        }}
      >
        Page {pagination.current} of {pagination.total}
      </div>
      <button
        onClick={() => onPageChange(pagination.current + 1)}
        disabled={pagination.current === pagination.total}
        style={{
          background: "var(--white)",
          border: "1px solid var(--rule)",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: pagination.current === pagination.total ? "var(--ink3)" : "var(--ink)",
          padding: "6px 12px",
          cursor: pagination.current === pagination.total ? "default" : "pointer",
          transition: "all 0.15s",
          opacity: pagination.current === pagination.total ? 0.5 : 1,
        }}
      >
        Next →
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ config, onPageChange }) => {
  const [activePage, setActivePage] = useState<"home" | "screener" | "methodology">("home");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    provider: "all",
    tier: "all",
    sortKey: "input",
    sortDir: "asc",
    currentPage: 1,
    pageSize: 25,
  });

  // Get unique providers from models
  const providers = useMemo(() => {
    return Array.from(new Set(config.models.map((m) => m.provider))).sort();
  }, [config.models]);

  // Filter and sort models
  const filteredAndSorted = useMemo(() => {
    let filtered = filterModels(config.models, filters.search, filters.provider, filters.tier);
    return sortModels(filtered, filters.sortKey as string, filters.sortDir);
  }, [config.models, filters.search, filters.provider, filters.tier, filters.sortKey, filters.sortDir]);

  // Paginate results
  const { items: paginatedModels, pagination } = useMemo(() => {
    return paginateArray(filteredAndSorted, filters.pageSize, filters.currentPage);
  }, [filteredAndSorted, filters.currentPage, filters.pageSize]);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, currentPage: newPage }));
    onPageChange?.(newPage);
  };

  const handleSort = (key: string) => {
    if (filters.sortKey === key) {
      setFilters((prev) => ({
        ...prev,
        sortDir: prev.sortDir === "asc" ? "desc" : "asc",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortKey: key as any,
        sortDir: "asc",
      }));
    }
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      {/* HOME PAGE */}
      <Page active={activePage === "home"}>
        <HeroSection
          indexValue={config.indexValue}
          indexDate={config.indexDate}
          deflation={config.deflation}
          deflationPeriod={config.deflationPeriod}
          onExploreClick={() => setActivePage("screener")}
          onMethodologyClick={() => setActivePage("methodology")}
        />
        <StatsRow stats={config.stats} />
      </Page>

      {/* SCREENER PAGE */}
      <Page active={activePage === "screener"}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "48px 56px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 32,
              paddingBottom: 20,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 32,
                  fontWeight: 500,
                  color: "var(--ink)",
                  marginBottom: 4,
                  letterSpacing: "-0.5px",
                }}
              >
                Model Screener
              </h1>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ink4)",
                }}
              >
                {config.modelsTracked.toLocaleString()} models · {config.providers} providers · sorted by input price ·
                updated daily at 06:00 UTC
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 32,
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--gold2)",
                    marginBottom: 2,
                  }}
                >
                  ${config.cheapestModel.toFixed(4)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink4)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Cheapest input
                </div>
              </div>
            </div>
          </div>

          <ScreenerControls
            filters={filters}
            modelCount={filteredAndSorted.length}
            providers={providers}
            onSearchChange={(search) =>
              setFilters((prev) => ({ ...prev, search, currentPage: 1 }))
            }
            onProviderChange={(provider) =>
              setFilters((prev) => ({ ...prev, provider, currentPage: 1 }))
            }
            onTierChange={(tier) =>
              setFilters((prev) => ({ ...prev, tier, currentPage: 1 }))
            }
          />

          <ModelTable
            models={paginatedModels}
            pagination={pagination}
            sortState={{ key: filters.sortKey as string, dir: filters.sortDir }}
            onSort={handleSort}
            onPageChange={handlePageChange}
          />
        </div>
      </Page>

      {/* METHODOLOGY PAGE */}
      <Page active={activePage === "methodology"}>
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "56px 56px 100px",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--rule)",
              paddingBottom: 48,
              marginBottom: 48,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--gold2)",
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              Methodology · v1.2
            </div>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: 36,
                fontWeight: 500,
                lineHeight: 1.15,
                letterSpacing: "-0.5px",
                color: "var(--ink)",
                marginBottom: 14,
              }}
            >
              How ACPI is calculated
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink3)",
                lineHeight: 1.9,
                maxWidth: 580,
              }}
            >
              Every input is sourced from public data. Every calculation is reproducible. This is the full methodology —
              no black boxes.
            </p>
          </div>

          <div
            style={{
              marginBottom: 56,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--gold2)",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              01
            </div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--ink)",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid var(--rule)",
                letterSpacing: "-0.3px",
              }}
            >
              What is ACPI?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink3)",
                lineHeight: 1.9,
                marginBottom: 14,
              }}
            >
              ACPI stands for <strong>AI Compute Price Index</strong>. It is a single quality-adjusted reference price
              for AI inference, published daily, covering the full addressable market across modalities and providers.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink3)",
                lineHeight: 1.9,
                marginBottom: 14,
              }}
            >
              The closest analogy is the <strong>Consumer Price Index (CPI)</strong> — the benchmark governments use to
              measure inflation across a basket of goods. ACPI does the same for AI compute: it tracks a basket of
              models across the market and tells you whether compute is inflating or deflating over time.
            </p>
            <div
              style={{
                background: "var(--gold3)",
                border: "1px solid var(--rule)",
                padding: "16px 20px",
                margin: "16px 0",
                fontSize: 13,
                color: "var(--ink2)",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "var(--gold2)" }}>In one sentence:</strong> Every model in the universe gets an
              ACPI score. The master index is the equal-weighted mean of all those scores, updated daily at 06:00 UTC.
            </div>
          </div>
        </div>
      </Page>
    </div>
  );
};

export default Dashboard;
