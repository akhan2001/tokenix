import chalk from "chalk";
import * as readline from "readline";
import { config } from "../config.js";
export async function loginCommand() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const key = await new Promise((resolve) => {
        rl.question(chalk.cyan("Enter your Tokenix API key (txk-...): "), (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
    if (!key.startsWith("txk-")) {
        console.error(chalk.red("Invalid key format. Keys start with txk-"));
        process.exit(1);
    }
    const analyticsUrl = config.get("analyticsUrl");
    let ora;
    try {
        ora = (await import("ora")).default;
    }
    catch {
        console.log("Validating key...");
        await saveKey(key, analyticsUrl);
        return;
    }
    const spinner = ora("Validating key...").start();
    try {
        const res = await fetch(`${analyticsUrl}/api/v1/summary`, {
            headers: { Authorization: `Bearer ${key}` },
        });
        if (res.status === 401 || res.status === 403) {
            spinner.fail(chalk.red("Invalid or expired key."));
            process.exit(1);
        }
        if (!res.ok && res.status !== 404) {
            spinner.warn(chalk.yellow(`Server returned ${res.status} — key saved anyway.`));
        }
        else {
            spinner.succeed(chalk.green("Key validated."));
        }
    }
    catch {
        spinner.warn(chalk.yellow("Could not reach analytics API — key saved locally."));
    }
    await saveKey(key, analyticsUrl);
}
async function saveKey(key, analyticsUrl) {
    config.set("apiKey", key);
    console.log(chalk.green(`\nLogged in. Config stored at: ${config.path}`));
    console.log(chalk.dim(`Analytics: ${analyticsUrl}`));
}
