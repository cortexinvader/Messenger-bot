import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

export class SQLiteDatabase {
    private db: Database.Database;

    constructor(dbPath: string = './data/bot.db') {
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        fs.ensureDirSync(dir);
        
        this.db = new Database(dbPath);
        this.initializeTables();
    }

    private initializeTables() {
        const schema = `
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                thread_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                members INTEGER DEFAULT 0,
                verified BOOLEAN DEFAULT 0,
                ai_enabled BOOLEAN DEFAULT 0,
                image_analysis_enabled BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS commands (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                permission TEXT NOT NULL DEFAULT 'user',
                status TEXT NOT NULL DEFAULT 'active',
                file_path TEXT NOT NULL,
                source_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                sender_name TEXT,
                content TEXT,
                message_type TEXT DEFAULT 'text',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bot_config (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS activity (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                thread_id TEXT,
                user_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
            CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp);
        `;

        this.db.exec(schema);
    }

    // Group methods
    getAllGroups() {
        return this.db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
    }

    getGroupByThreadId(threadId: string) {
        return this.db.prepare('SELECT * FROM groups WHERE thread_id = ?').get(threadId);
    }

    createGroup(group: any) {
        const stmt = this.db.prepare(`
            INSERT INTO groups (id, thread_id, name, members, verified, ai_enabled, image_analysis_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            group.id,
            group.threadId,
            group.name,
            group.members || 0,
            group.verified ? 1 : 0,
            group.aiEnabled ? 1 : 0,
            group.imageAnalysisEnabled ? 1 : 0
        );
    }

    updateGroup(id: string, updates: any) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        const stmt = this.db.prepare(`UPDATE groups SET ${fields} WHERE id = ?`);
        return stmt.run(...values, id);
    }

    // Command methods
    getAllCommands() {
        return this.db.prepare('SELECT * FROM commands ORDER BY created_at DESC').all();
    }

    getCommandByName(name: string) {
        return this.db.prepare('SELECT * FROM commands WHERE name = ?').get(name);
    }

    createCommand(command: any) {
        const stmt = this.db.prepare(`
            INSERT INTO commands (id, name, description, permission, status, file_path, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            command.id,
            command.name,
            command.description,
            command.permission,
            command.status,
            command.filePath,
            command.sourceUrl
        );
    }

    deleteCommand(id: string) {
        return this.db.prepare('DELETE FROM commands WHERE id = ?').run(id);
    }

    // Message methods
    getMessages(threadId: string, limit: number = 50) {
        return this.db.prepare(`
            SELECT * FROM messages 
            WHERE thread_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(threadId, limit);
    }

    createMessage(message: any) {
        const stmt = this.db.prepare(`
            INSERT INTO messages (id, thread_id, sender_id, sender_name, content, message_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            message.id,
            message.threadId,
            message.senderId,
            message.senderName,
            message.content,
            message.messageType
        );
    }

    // Config methods
    getBotConfig(key: string) {
        return this.db.prepare('SELECT * FROM bot_config WHERE key = ?').get(key);
    }

    setBotConfig(key: string, value: any) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO bot_config (id, key, value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        return stmt.run(require('crypto').randomUUID(), key, JSON.stringify(value));
    }

    // Activity methods
    getActivities(limit: number = 50) {
        return this.db.prepare(`
            SELECT * FROM activity 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(limit);
    }

    createActivity(activity: any) {
        const stmt = this.db.prepare(`
            INSERT INTO activity (id, type, description, thread_id, user_id)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(
            activity.id,
            activity.type,
            activity.description,
            activity.threadId,
            activity.userId
        );
    }

    close() {
        this.db.close();
    }
}
