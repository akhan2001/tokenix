import chalk from "chalk";
import { config, getKey } from "../config.js";
export async function dashboardCommand() {
    const key = getKey();
    const analyticsUrl = config.get("analyticsUrl");
    let spinner = null;
    try {
        const ora = (await import("ora")).default;
        spinner = ora("Loading dashboard...").start();
    }
    catch {
        console.log("Loading dashboard...");
    }
    const [acpi, summary] = await Promise.allSettled([
        fetchAcpi(),
        fetchSummary(analyticsUrl, key),
    ]);
    spinner?.stop();
    process.stdout.write("\x1Bc"); // clear screen
    printHeader();
    if (acpi.status === "fulfilled") {
        printAcpi(acpi.value);
    }
    else {
        console.log(chalk.red(" Could not load ACPI index."));
    }
    const s = summary.status === "fulfilled" ? summary.value : null;
    printUsage(s);
    printFooter();
}
async function fetchAcpi() {
    const res = await fetch("https://raw.githubusercontent.com/akhan2001/tokenix/main/dashboard/data/acpi_latest.json");
    if (!res.ok)
        throw new Error(`${res.status}`);
    return res.json();
}
async function fetchSummary(url, key) {
    const res = await fetch(`${url}/api/v1/summary`, {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok)
        throw new Error(`${res.status}`);
    return res.json();
}
function printHeader() {
    const sep = chalk.dim("═".repeat(52));
    console.log("");
    console.log(sep);
    console.log(chalk.bold.white("  TOKENIX  ") + chalk.dim("AI Compute Price Index"));
    console.log(sep);
}
function printAcpi(data) {
    const sep = chalk.dim("─".repeat(52));
    const ts = new Date(data.computed_at).toLocaleString();
    console.log("");
    console.log(chalk.bold(" ACPI Index"));
    console.log(sep);
    console.log(`  ${chalk.bold.green(`$${data.acpi.toFixed(4)}`)}` +
        chalk.dim(" / 1M SCU") +
        chalk.dim(`   updated ${ts}`));
    console.log("");
    console.log(`  ${chalk.dim("Premium  ")} ${chalk.white(data.buckets.premium_count + " models")}   ` +
        chalk.dim("avg ") + chalk.yellow(`$${data.buckets.premium_mean.toFixed(4)}`));
    console.log(`  ${chalk.dim("Commodity")} ${chalk.white(data.buckets.commodity_count + " models")}   ` +
        chalk.dim("avg ") + chalk.yellow(`$${data.buckets.commodity_mean.toFixed(4)}`));
    console.log(`  ${chalk.dim("Coverage ")} ${chalk.white(data.model_count + " models")} across ` +
        chalk.white(data.provider_count + " providers"));
}
function printUsage(s) {
    const sep = chalk.dim("─".repeat(52));
    const fmt = (n) => n >= 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(6)}`;
    console.log("");
    console.log(chalk.bold(" Your Usage"));
    console.log(sep);
    if (!s) {
        console.log(chalk.red("  Unavailable"));
        return;
    }
    console.log(`  This month   ${chalk.green.bold(fmt(s.this_month_spend_usd ?? 0))}`);
    console.log(`  Last month   ${chalk.dim(fmt(s.last_month_spend_usd ?? 0))}`);
    if (s.mom_change_pct !== null && s.mom_change_pct !== undefined) {
        const sign = s.mom_change_pct >= 0 ? "+" : "";
        const color = s.mom_change_pct >= 0 ? chalk.red : chalk.green;
        console.log(`  MoM change   ${color(sign + s.mom_change_pct.toFixed(1) + "%")}`);
    }
    console.log(`  Requests     ${chalk.cyan(String(s.total_requests ?? 0))}`);
    if (s.vs_acpi_pct !== null && s.vs_acpi_pct !== undefined) {
        const sign = s.vs_acpi_pct >= 0 ? "+" : "";
        const color = s.vs_acpi_pct >= 0 ? chalk.red : chalk.green;
        console.log(`  vs ACPI      ${color(sign + s.vs_acpi_pct.toFixed(1) + "%")}`);
    }
    if (s.top_model) {
        console.log(`  Top model    ${chalk.white(s.top_model.model_id)}  ${chalk.green(fmt(s.top_model.cost_usd))}`);
    }
}
function printFooter() {
    const sep = chalk.dim("═".repeat(52));
    console.log("");
    console.log(sep);
    console.log(chalk.dim("  tokenix cost   |   tokenix login"));
    console.log(sep);
    console.log("");
}
