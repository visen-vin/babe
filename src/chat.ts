import { executeAgentFlow } from "./core/agent";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

async function terminalChat() {
    console.log("\n--- 🧠 Vaspbot CLI Mode ---");
    console.log("Type 'exit' to quit.\n");

    while (true) {
        const userInput = await rl.question("> ");

        if (userInput.toLowerCase() === "exit") {
            console.log("Goodbye!");
            process.exit(0);
        }

        if (!userInput.trim()) continue;

        console.log("\n[Brain] Processing...");
        const response = await executeAgentFlow(userInput);
        console.log(`\n[Vaspbot]: ${response}\n`);
    }
}

terminalChat().catch(console.error);
