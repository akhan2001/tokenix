/**
 * Example: Integrating the TypeScript Dashboard
 *
 * This file shows how to use the new Dashboard component
 * in your Next.js pages with real and sample data.
 */

import { Dashboard } from "@/components/dashboard";
import { generateDashboardConfig } from "@/lib/dashboard-config";
import { loadPrices } from "@/lib/data";
import type { Model } from "@/lib/types";

/**
 * Example 1: Using with sample data (for prototyping)
 */
export function DashboardWithSampleData() {
  const config = generateDashboardConfig();
  return <Dashboard config={config} />;
}

/**
 * Example 2: Converting your existing CSV data to the Dashboard format
 */
export function DashboardWithRealData() {
  // Load your existing CSV data
  const priceRows = loadPrices();

  // Convert PriceRow[] to Model[]
  const models: Model[] = priceRows
    .filter((row) => row.input_per_million_usd > 0)
    .map((row) => ({
      name: row.model_name,
      provider: row.provider || "Unknown",
      tier: getTierFromPrice(row.input_per_million_usd),
      context: row.context_length || "—",
      input: row.input_per_million_usd,
      output: row.output_per_million_usd || 0,
      chg: 0, // TODO: Calculate from historical data
    }))
    .slice(0, 100); // Limit for demo

  const config = generateDashboardConfig({
    models,
    modelsTracked: priceRows.length,
    providers: new Set(priceRows.map((r) => r.provider)).size,
  });

  return <Dashboard config={config} />;
}

/**
 * Helper function to determine tier from price
 */
function getTierFromPrice(input: number): "S" | "A" | "B" | "C" {
  if (input >= 10) return "S";
  if (input >= 1) return "A";
  if (input >= 0.1) return "B";
  return "C";
}

/**
 * Example 3: Client-side component with state management
 */
"use client";

import { useState, useEffect } from "react";
import type { DashboardConfig } from "@/lib/types";

export function DashboardWithDynamicData() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch dashboard configuration from your API
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard-config");
        if (!response.ok) throw new Error("Failed to fetch config");
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "red" }}>
        Error: {error}
      </div>
    );
  }

  if (!config) {
    return <div style={{ padding: "40px", textAlign: "center" }}>No data available</div>;
  }

  return (
    <Dashboard
      config={config}
      onPageChange={(page) => {
        console.log("User navigated to page:", page);
      }}
    />
  );
}

/**
 * Example 4: Using in your existing page.tsx
 *
 * Replace this in your dashboard/app/page.tsx:
 */
/*
import { DashboardWithRealData } from "@/components/dashboard-examples";

export const dynamic = "force-dynamic";

export default function Home() {
  return <DashboardWithRealData />;
}
*/

/**
 * Example 5: API route to provide dashboard config
 *
 * Create this at dashboard/app/api/dashboard-config/route.ts:
 */
/*
import { loadPrices } from "@/lib/data";
import { generateDashboardConfig } from "@/lib/dashboard-config";
import type { Model } from "@/lib/types";

export async function GET() {
  try {
    const priceRows = loadPrices();

    const models: Model[] = priceRows
      .filter((row) => row.input_per_million_usd > 0)
      .map((row) => ({
        name: row.model_name,
        provider: row.provider || "Unknown",
        tier: getTierFromPrice(row.input_per_million_usd),
        context: row.context_length || "—",
        input: row.input_per_million_usd,
        output: row.output_per_million_usd || 0,
        chg: 0,
      }));

    const config = generateDashboardConfig({
      models,
      modelsTracked: priceRows.length,
      providers: new Set(priceRows.map((r) => r.provider)).size,
    });

    return Response.json(config);
  } catch (error) {
    return Response.json(
      { error: "Failed to generate config" },
      { status: 500 }
    );
  }
}

function getTierFromPrice(input: number): "S" | "A" | "B" | "C" {
  if (input >= 10) return "S";
  if (input >= 1) return "A";
  if (input >= 0.1) return "B";
  return "C";
}
*/

/**
 * Example 6: Real-time updates with polling
 */
export function DashboardWithRealTimeUpdates() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);

  useEffect(() => {
    // Initial load
    fetch("/api/dashboard-config")
      .then((r) => r.json())
      .then((data) => setConfig(data));

    // Poll for updates every minute
    const interval = setInterval(() => {
      fetch("/api/dashboard-config")
        .then((r) => r.json())
        .then((data) => setConfig(data));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!config) return <div>Loading...</div>;

  return <Dashboard config={config} />;
}

export default DashboardWithSampleData;
