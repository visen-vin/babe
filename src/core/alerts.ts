import { getStats, getServerMetrics } from "./usage";

const ALERT_THRESHOLDS = {
    CPU_LOAD: 0.8, // 80%
    MEMORY_USAGE_PERCENT: 90, // 90%
    DAILY_COST_USD: 1.0, // $1.00
};

let lastAlertTimestamp = 0;
const ALERT_COOLDOWN = 1000 * 60 * 60; // 1 hour cooldown between same alerts

export async function checkSystemHealth(bot: any) {
    const ownerId = process.env.TELEGRAM_OWNER_ID;
    if (!ownerId) {
        // console.log("[Alerts] No TELEGRAM_OWNER_ID set in .env. Skipping proactive checks.");
        return;
    }

    const metrics = getServerMetrics();
    const stats = getStats();

    const today = new Date().toISOString().split('T')[0];
    const dailyCost = stats
        .filter((r: any) => r.timestamp.startsWith(today))
        .reduce((sum: number, r: any) => sum + r.cost, 0);

    const alerts: string[] = [];

    // Check CPU
    if (parseFloat(metrics.cpuLoad) > ALERT_THRESHOLDS.CPU_LOAD) {
        alerts.push(`⚠️ *High CPU Load:* ${metrics.cpuLoad}`);
    }

    // Check Memory
    if (parseFloat(metrics.memory.percent) > ALERT_THRESHOLDS.MEMORY_USAGE_PERCENT) {
        alerts.push(`⚠️ *High Memory Usage:* ${metrics.memory.percent}`);
    }

    // Check Cost
    if (dailyCost > ALERT_THRESHOLDS.DAILY_COST_USD) {
        alerts.push(`💸 *Cost Alert:* Today's spending has reached $${dailyCost.toFixed(2)}`);
    }

    if (alerts.length > 0) {
        const now = Date.now();
        if (now - lastAlertTimestamp > ALERT_COOLDOWN) {
            const message = `🚨 *Vaspbot System Alert* 🚨\n\n${alerts.join('\n')}\n\nCheck dashboard: http://${process.env.REMOTE_IP || '3.25.126.69'}:3001`;
            try {
                await bot.telegram.sendMessage(ownerId, message, { parse_mode: 'Markdown' });
                lastAlertTimestamp = now;
                console.log("[Alerts] Proactive notification sent to owner.");
            } catch (err) {
                console.error("[Alerts] Failed to send telegram alert:", err);
            }
        }
    }
}
