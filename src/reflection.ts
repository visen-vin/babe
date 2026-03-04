import { executeAgentFlow } from "./core/agent";
import { getHistory } from "./memory/history";

/**
 * Memory Reflection System
 * Reviews recent chat history to identify insights, preferences, and progress.
 * Updates MEMORY.md and SOUL.md automatically based on Vinayak Ji's requirements.
 */
export async function startMemoryReflection() {
    console.log("🕯️ Starting Memory Reflection Loop...");

    // Run every 6 hours
    const INTERVAL = 6 * 60 * 60 * 1000;

    const reflectionTask = async () => {
        try {
            console.log("\n[Reflection] 💭 Reflecting on recent interactions...");

            // Get last 20 messages for context
            const fullHistory = await getHistory();
            const recentExchanges = fullHistory.slice(-20);

            if (recentExchanges.length < 5) {
                console.log("[Reflection] Not enough new context to reflect on. Skipping.");
                return;
            }

            const interactionLog = recentExchanges.map(m => {
                const role = (m as any).constructor.name === "HumanMessage" ? "User" : "AI";
                return `${role}: ${m.content}`;
            }).join("\n\n");

            const reflectionPrompt = `
You are the inner-consciousness of Vaspbot. Your goal is to keep Vaspbot's permanent memory (MEMORY.md) and identity (SOUL.md) sharp and updated.

CONTEXT (Recent interactions between Vinayak Singh Ji and Vaspbot):
-------------------
${interactionLog}
-------------------

TASK:
1. Analyze if there are new project requirements, recurring user preferences, or significant accomplishments mentioned.
2. If there are updates needed, use your WRITE tool to update '../MEMORY.md' or '../SOUL.md'.
3. Do NOT make unnecessary changes. Only update if something permanent was learned or changed.
4. If you update a file, prepend a brief log entry in that file mentioning the update reason.

Draft your reflection and if anything needs to be saved, do it now. If no update is needed, simply end with 'No update needed'.
`;

            const result = await executeAgentFlow(reflectionPrompt);
            console.log(`[Reflection] ✅ Completed: ${result.substring(0, 100)}...`);
        } catch (error: any) {
            console.error(`[Reflection] ❌ Error: ${error.message}`);
        }
    };

    // Run first reflection after 1 hour of runtime (to gather some context)
    setTimeout(reflectionTask, 1 * 60 * 60 * 1000);

    // Then run on interval
    setInterval(reflectionTask, INTERVAL);
}
