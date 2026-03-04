import { Database } from "bun:sqlite";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const DB_PATH = "vasp_memory.sqlite";

export class SqliteChatMessageHistory extends BaseChatMessageHistory {
    lc_namespace = ["vaspbot", "memory", "sqlite_history"];
    private db: Database;
    private sessionId: string;

    constructor(sessionId: string) {
        super();
        this.db = new Database(DB_PATH);
        this.sessionId = sessionId;
        this.init();
    }

    private init() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async getMessages(): Promise<BaseMessage[]> {
        const rows = this.db.query("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC")
            .all(this.sessionId) as any[];

        return rows.map(row => {
            if (row.role === "user") return new HumanMessage(row.content);
            if (row.role === "ai") return new AIMessage(row.content);
            if (row.role === "system") return new SystemMessage(row.content);
            return new HumanMessage(row.content);
        });
    }

    async addMessage(message: BaseMessage): Promise<void> {
        let role = "user";
        if (message instanceof AIMessage) role = "ai";
        else if (message instanceof SystemMessage) role = "system";

        this.db.run(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            [this.sessionId, role, message.content.toString()]
        );
    }

    async clear(): Promise<void> {
        this.db.run("DELETE FROM messages WHERE session_id = ?", [this.sessionId]);
    }
}
