import fs from "fs";
import path from "path";

const USAGE_FILE = path.join(process.cwd(), "usage_stats.json");

interface UsageRecord {
    timestamp: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

// Prices are per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
    "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
    "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    "meta-llama/llama-3-8b-instruct:free": { input: 0, output: 0 },
};

export function logUsage(modelName: string, inputTokens: number, outputTokens: number) {
    const pricing = PRICING[modelName] || { input: 0, output: 0 };
    const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

    const record: UsageRecord = {
        timestamp: new Date().toISOString(),
        model: modelName,
        inputTokens,
        outputTokens,
        cost,
    };

    let stats: UsageRecord[] = [];
    if (fs.existsSync(USAGE_FILE)) {
        try {
            stats = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
        } catch (e) {
            stats = [];
        }
    }

    stats.push(record);

    // Keep only last 1000 records to avoid huge files
    if (stats.length > 1000) stats.shift();

    fs.writeFileSync(USAGE_FILE, JSON.stringify(stats, null, 2));
    console.log(`[Usage] Logged: ${modelName} | Tokens: ${inputTokens + outputTokens} | Cost: $${cost.toFixed(6)}`);
}

export function getStats() {
    if (!fs.existsSync(USAGE_FILE)) return [];
    return JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
}

export function getServerMetrics() {
    const os = require("os");
    const load = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
        cpuLoad: load[0].toFixed(2), // 1 min load average
        memory: {
            total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + " GB",
            used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + " GB",
            percent: ((usedMem / totalMem) * 100).toFixed(1) + "%",
        },
        uptime: (os.uptime() / 3600).toFixed(1) + " hours",
    };
}
