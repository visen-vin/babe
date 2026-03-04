import { executeAgentFlow } from "./core/agent";

/**
 * Autonomous Research Loop
 * Runs background tasks every X hours.
 */
export async function startAutonomousResearch() {
    console.log("🛠️ Starting Autonomous Research Loop...");

    // Run every 12 hours (12 * 60 * 60 * 1000)
    const INTERVAL = 12 * 60 * 60 * 1000;

    const researchTask = async () => {
        try {
            console.log("\n[Autonomous] 🧠 Starting scheduled research mission...");

            const objective = `Objective: Research the latest trending papers and tools in 'AI Agent Memory' and 'Multi-Agent Context Management'. 
            1. Find 2-3 key insights.
            2. Update the 'README.md' of the project to include a section 'Latest Bot Architect Research' with these findings.
            3. Push the changes to GitHub.
            4. If successful, end with a concise report.`;

            const result = await executeAgentFlow(objective);
            console.log(`[Autonomous] ✅ Research mission completed. Result: ${result.substring(0, 100)}...`);
        } catch (error: any) {
            console.error(`[Autonomous] ❌ Research error: ${error.message}`);
        }
    };

    // Run immediately on start
    researchTask();

    // Then run on interval
    setInterval(researchTask, INTERVAL);
}
