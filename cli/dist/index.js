#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { costCommand } from "./commands/cost.js";
import { dashboardCommand } from "./commands/dashboard.js";
const program = new Command();
program
    .name("tokenix")
    .description("Tokenix AI Compute Price Index — terminal client")
    .version("0.1.0");
program
    .command("login")
    .description("Authenticate with your txk- API key")
    .action(loginCommand);
program
    .command("dashboard")
    .description("Live ACPI index + your usage stats")
    .action(dashboardCommand);
program
    .command("cost")
    .description("Quick spend summary")
    .action(costCommand);
program.parse();
