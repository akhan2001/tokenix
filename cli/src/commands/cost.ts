import chalk from "chalk";
import { config, getKey } from "../config.js";

interface Summary {
  this_month_spend_usd: number;
  last_month_spend_usd: number;
  mom_change_pct: number | null;
  acpi_benchmark_usd: number;
  vs_acpi_pct: number | null;
  top_model: { model_id: string; cost_usd: number } | null;
  total_requests: number;
}

export async function costCommand(): Promise<void> {
  const key = getKey();
  const analyticsUrl = config.get("analyticsUrl");

  let spinner: ReturnType<typeof import("ora").default> | null = null;
  try {
    const ora = (await import("ora")).default;
    spinner = ora("Fetching usage...").start();
  } catch {
    console.log("Fetching usage...");
  }

  try {
    const res = await fetch(`${analyticsUrl}/api/v1/summary`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    spinner?.stop();

    if (res.status === 401 || res.status === 403) {
      console.error(chalk.red("Auth failed. Run: tokenix login"));
      process.exit(1);
    }

    if (!res.ok) {
      console.error(chalk.red(`API error: ${res.status}`));
      process.exit(1);
    }

    const data = (await res.json()) as Summary;
    printCostSummary(data);
  } catch (err) {
    spinner?.fail("Request failed");
    console.error(chalk.red(String(err)));
    process.exit(1);
  }
}

function fmt(n: number): string {
  return n >= 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(6)}`;
}

function printCostSummary(data: Summary): void {
  const sep = chalk.dim("─".repeat(44));

  console.log("");
  console.log(chalk.bold.white(" TOKENIX — Spend Summary"));
  console.log(sep);

  console.log(` This month     ${chalk.green.bold(fmt(data.this_month_spend_usd ?? 0))}`);
  console.log(` Last month     ${chalk.dim(fmt(data.last_month_spend_usd ?? 0))}`);

  if (data.mom_change_pct !== null && data.mom_change_pct !== undefined) {
    const sign = data.mom_change_pct >= 0 ? "+" : "";
    const color = data.mom_change_pct >= 0 ? chalk.red : chalk.green;
    console.log(` MoM change     ${color(sign + data.mom_change_pct.toFixed(1) + "%")}`);
  }

  console.log(` Requests       ${chalk.cyan(String(data.total_requests ?? 0))}`);

  if (data.acpi_benchmark_usd) {
    console.log(sep);
    console.log(` ACPI bench     ${chalk.yellow(fmt(data.acpi_benchmark_usd))}`);
    if (data.vs_acpi_pct !== null && data.vs_acpi_pct !== undefined) {
      const sign = data.vs_acpi_pct >= 0 ? "+" : "";
      const color = data.vs_acpi_pct >= 0 ? chalk.red : chalk.green;
      console.log(` vs index       ${color(sign + data.vs_acpi_pct.toFixed(1) + "%")}`);
    }
  }

  if (data.top_model) {
    console.log(sep);
    console.log(` Top model      ${chalk.white(data.top_model.model_id)}`);
    console.log(`                ${chalk.green(fmt(data.top_model.cost_usd))}`);
  }

  console.log(sep);
  console.log("");
}
