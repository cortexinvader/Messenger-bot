import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import login from 'fca-unofficial';
import axios from 'axios';
import { exec } from 'child_process';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { GeminiService } from './gemini';
import { CommandManager } from './command-manager';
import { SQLiteDatabase } from './database';
import { UptimeService } from './uptime';

interface BotConfig {
    prefix: string;
    owners: string[];
    gemini: {
        apiKey: string;
        model: string;
        temperature: number;
        enabled: boolean;
    };
    fallback: {
        primary: string;
        secondary: string;
        autoSwitch: boolean;
    };
    rateLimit: {
        threshold: number;
        window: number;
    };
    features: {
        autoSaveCookies: boolean;
        imageAnalysis: boolean;
        shellAccess: boolean;
        dynamicCommands: boolean;
    };
    security: {
        requireGroupVerification: boolean;
        ownerApprovalForShell: boolean;
        maxShellTimeout: number;
    };
}

interface FacebookMessage {
    threadID: string;
    senderID: string;
    senderName?: string;
    body?: string;
    attachments?: any[];
    type: string;
}

interface FacebookAPI {
    sendMessage(message: any, threadID: string, callback?: (err: any, info: any) => void): void;
    sendTypingIndicator(threadID: string, callback?: (err: any) => void): void;
    getThreadInfo(threadID: string, callback: (err: any, info: any) => void): void;
    getUserInfo(userID: string, callback: (err: any, info: any) => void): void;
    getCurrentUserID(): string;
    getAppState(): any;
    setOptions(options: any): void;
    listenMqtt(callback: (err: any, event: any) => void): void;
    markAsRead(threadID: string, callback?: (err: any) => void): void;
    sendAttachment(attachment: any, threadID: string, callback?: (err: any, info: any) => void): void;
}

export class FacebookBot extends EventEmitter {
    private api: FacebookAPI | null = null;
    private config: BotConfig;
    private geminiService: GeminiService;
    private commandManager: CommandManager;
    private database: SQLiteDatabase;
    private uptimeService: UptimeService;
    private commands: Map<string, any> = new Map();
    private cooldowns: Map<string, number> = new Map();
    private isLoggedIn: boolean = false;
    private loginAttempts: number = 0;
    private maxLoginAttempts: number = 3;

    constructor(config: BotConfig, dbPath?: string) {
        super();
        this.config = config;
        this.database = new SQLiteDatabase(dbPath);
        this.commandManager = new CommandManager();
        this.uptimeService = new UptimeService();
        
        // Initialize Gemini service
        this.geminiService = new GeminiService({
            apiKey: process.env.GEMINI_API_KEY || config.gemini.apiKey,
            model: config.gemini.model,
            temperature: config.gemini.temperature,
            enabled: config.gemini.enabled,
            rateLimitThreshold: config.rateLimit.threshold
        });

        this.loadCommands();
    }

    async start(cookieData?: any): Promise<void> {
        try {
            let loginData = cookieData;

            if (!loginData) {
                const cookiePath = path.join(process.cwd(), 'bot', 'cookies', 'facebook.json');
                if (await fs.pathExists(cookiePath)) {
                    loginData = await fs.readJson(cookiePath);
                    console.log('🍪 Using saved cookies');
                } else {
                    throw new Error('No authentication data provided');
                }
            }

            await this.loginToFacebook(loginData);
        } catch (error) {
            console.error('❌ Failed to start bot:', error.message);
            this.emit('error', error);
            throw error;
        }
    }

    private async loginToFacebook(loginData: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.loginAttempts++;

            if (this.loginAttempts > this.maxLoginAttempts) {
                return reject(new Error('Maximum login attempts exceeded'));
            }

            console.log(`🔐 Attempting to login... (Attempt ${this.loginAttempts}/${this.maxLoginAttempts})`);

            login(loginData, async (err: any, api: FacebookAPI) => {
                if (err) {
                    console.error('❌ Login failed:', err.message);
                    
                    // Log login attempt
                    await this.database.createActivity({
                        id: randomUUID(),
                        type: 'login_failed',
                        description: `Login attempt failed: ${err.message}`,
                        timestamp: new Date()
                    });

                    return reject(err);
                }

                this.api = api;
                this.isLoggedIn = true;
                this.loginAttempts = 0;

                console.log('✅ Bot logged in successfully');

                // Save updated cookies if enabled
                if (this.config.features.autoSaveCookies) {
                    await this.saveCookies(api.getAppState());
                }

                // Configure API options
                api.setOptions({
                    listenEvents: true,
                    updatePresence: true,
                    forceLogin: true,
                    autoMarkDelivery: false,
                    autoMarkRead: false,
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                });

                // Log successful login
                await this.database.createActivity({
                    id: randomUUID(),
                    type: 'login_success',
                    description: 'Bot successfully logged in to Facebook',
                    timestamp: new Date()
                });

                // Start listening for messages
                api.listenMqtt(this.handleMessage.bind(this));

                // Start uptime service
                this.uptimeService.start();

                this.emit('ready');
                resolve();
            });
        });
    }

    private async saveCookies(appState: any): Promise<void> {
        try {
            const cookiesDir = path.join(process.cwd(), 'bot', 'cookies');
            await fs.ensureDir(cookiesDir);
            await fs.writeJson(path.join(cookiesDir, 'facebook.json'), appState, { spaces: 2 });
            console.log('🍪 Cookies saved successfully');
        } catch (error) {
            console.error('❌ Failed to save cookies:', error.message);
        }
    }

    private async loadCommands(): Promise<void> {
        try {
            this.commands = await this.commandManager.reloadAllCommands();
            console.log(`📋 Loaded ${this.commands.size} commands`);
        } catch (error) {
            console.error('❌ Failed to load commands:', error.message);
        }
    }

    private async handleMessage(err: any, event: any): Promise<void> {
        if (err) {
            console.error('❌ Message handling error:', err);
            return;
        }

        try {
            switch (event.type) {
                case 'message':
                    await this.processMessage(event);
                    break;
                case 'event':
                    await this.processEvent(event);
                    break;
            }
        } catch (error) {
            console.error('❌ Error processing message:', error.message);
        }
    }

    private async processMessage(message: FacebookMessage): Promise<void> {
        const { threadID, senderID, body, attachments } = message;

        // Skip bot's own messages
        if (senderID === this.api?.getCurrentUserID()) return;

        // Check if group is verified
        if (this.config.security.requireGroupVerification) {
            const group = this.database.getGroupByThreadId(threadID);
            if (!group || !group.verified) {
                console.log(`⚠️ Message from unverified group: ${threadID}`);
                return;
            }
        }

        // Log message to database
        await this.logMessage(message);

        // Handle commands
        if (body && body.startsWith(this.config.prefix)) {
            await this.handleCommand(message);
            return;
        }

        // Handle AI responses
        const group = this.database.getGroupByThreadId(threadID);
        if (group?.ai_enabled) {
            if (attachments && attachments.length > 0 && group.image_analysis_enabled) {
                await this.handleImageAnalysis(message);
            } else if (body && body.trim()) {
                await this.handleAIResponse(message);
            }
        }
    }

    private async handleCommand(message: FacebookMessage): Promise<void> {
        const { threadID, senderID, body } = message;
        
        if (!body) return;

        const args = body.slice(this.config.prefix.length).split(' ');
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = this.commands.get(commandName);
        if (!command) {
            return this.sendMessage('❌ Command not found. Use /help to see available commands.', threadID);
        }

        // Check cooldown
        const cooldownKey = `${senderID}-${commandName}`;
        const now = Date.now();
        const cooldownEnd = this.cooldowns.get(cooldownKey) || 0;

        if (now < cooldownEnd) {
            const remaining = Math.ceil((cooldownEnd - now) / 1000);
            return this.sendMessage(`⏳ Command on cooldown. Try again in ${remaining} seconds.`, threadID);
        }

        // Check permissions
        const userPermission = await this.getUserPermission(senderID, threadID);
        if (!this.hasPermission(userPermission, command.permission)) {
            return this.sendMessage('❌ You don\'t have permission to use this command.', threadID);
        }

        // Set cooldown
        if (command.cooldown) {
            this.cooldowns.set(cooldownKey, now + command.cooldown);
        }

        try {
            await command.execute(this.api, message, args, this);
            
            // Log command usage
            await this.database.createActivity({
                id: randomUUID(),
                type: 'command_used',
                description: `Command "${commandName}" used by ${senderID}`,
                threadId: threadID,
                userId: senderID,
                timestamp: new Date()
            });
        } catch (error) {
            console.error(`❌ Command error (${commandName}):`, error.message);
            this.sendMessage('❌ An error occurred while executing the command.', threadID);
        }
    }

    private async handleAIResponse(message: FacebookMessage): Promise<void> {
        const { threadID, body } = message;

        if (!body || !this.geminiService) return;

        try {
            this.api?.sendTypingIndicator(threadID);
            
            const response = await this.geminiService.generateResponse(body);
            
            if (response) {
                this.sendMessage(`🤖 ${response}`, threadID);
            }
        } catch (error) {
            console.error('❌ AI response error:', error.message);

            // Handle rate limit errors with fallback
            if (error.message.includes('RATE_LIMIT_EXCEEDED') && this.config.fallback.autoSwitch) {
                this.sendMessage('🔄 AI service is temporarily overloaded. Please try again later.', threadID);
            }
        }
    }

    private async handleImageAnalysis(message: FacebookMessage): Promise<void> {
        const { threadID, attachments } = message;

        if (!attachments || !this.geminiService) return;

        try {
            for (const attachment of attachments) {
                if (attachment.type === 'photo') {
                    this.api?.sendTypingIndicator(threadID);
                    
                    const imageUrl = attachment.url || attachment.hiresUrl;
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data);

                    // Convert to JPEG if needed
                    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();

                    const analysis = await this.geminiService.analyzeImage(jpegBuffer);
                    
                    if (analysis) {
                        this.sendMessage(`🖼️ Image Analysis: ${analysis}`, threadID);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Image analysis error:', error.message);
        }
    }

    private async processEvent(event: any): Promise<void> {
        console.log('📅 Event received:', event.logMessageType);
        
        // Log significant events
        if (['log:subscribe', 'log:unsubscribe'].includes(event.logMessageType)) {
            await this.database.createActivity({
                id: randomUUID(),
                type: event.logMessageType,
                description: `User ${event.logMessageType === 'log:subscribe' ? 'joined' : 'left'} group`,
                threadId: event.threadID,
                userId: event.author,
                timestamp: new Date()
            });
        }
    }

    private async getUserPermission(userID: string, threadID: string): Promise<string> {
        // Check if user is owner
        if (this.config.owners.includes(userID)) {
            return 'owner';
        }

        // Check if user is admin
        try {
            return new Promise((resolve) => {
                this.api?.getThreadInfo(threadID, (err, info) => {
                    if (err || !info) {
                        return resolve('user');
                    }

                    const adminIDs = info.adminIDs || [];
                    if (adminIDs.some((admin: any) => admin.id === userID)) {
                        resolve('admin');
                    } else {
                        resolve('user');
                    }
                });
            });
        } catch (error) {
            console.error('❌ Failed to get user permission:', error.message);
            return 'user';
        }
    }

    private hasPermission(userPermission: string, requiredPermission: string): boolean {
        const permissions = ['user', 'admin', 'owner'];
        const userLevel = permissions.indexOf(userPermission);
        const requiredLevel = permissions.indexOf(requiredPermission);
        return userLevel >= requiredLevel;
    }

    private async logMessage(message: FacebookMessage): Promise<void> {
        try {
            await this.database.createMessage({
                id: randomUUID(),
                threadId: message.threadID,
                senderId: message.senderID,
                senderName: message.senderName,
                content: message.body,
                messageType: message.attachments?.length > 0 ? 'image' : 'text'
            });
        } catch (error) {
            console.error('❌ Failed to log message:', error.message);
        }
    }

    // Public methods for external use
    public sendMessage(message: string, threadID: string): void {
        if (!this.api) {
            console.error('❌ Bot not connected');
            return;
        }

        this.api.sendMessage(message, threadID, (err: any) => {
            if (err) {
                console.error('❌ Failed to send message:', err);
            }
        });
    }

    public async sendMedia(filePath: string, threadID: string, type: 'image' | 'video' | 'audio' = 'image'): Promise<boolean> {
        if (!this.api) {
            console.error('❌ Bot not connected');
            return false;
        }

        try {
            const attachment = fs.createReadStream(filePath);
            
            return new Promise((resolve) => {
                this.api?.sendMessage({
                    attachment: attachment
                }, threadID, (err: any) => {
                    if (err) {
                        console.error(`❌ Failed to send ${type}:`, err);
                        resolve(false);
                    } else {
                        console.log(`✅ ${type} sent successfully`);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error(`❌ Error preparing ${type}:`, error);
            return false;
        }
    }

    public async sendImageFromUrl(imageUrl: string, threadID: string, caption?: string): Promise<boolean> {
        if (!this.api) {
            console.error('❌ Bot not connected');
            return false;
        }

        try {
            const response = await axios.get(imageUrl, { responseType: 'stream' });
            
            return new Promise((resolve) => {
                const message: any = {
                    attachment: response.data
                };
                
                if (caption) {
                    message.body = caption;
                }

                this.api?.sendMessage(message, threadID, (err: any) => {
                    if (err) {
                        console.error('❌ Failed to send image from URL:', err);
                        resolve(false);
                    } else {
                        console.log('✅ Image from URL sent successfully');
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('❌ Error downloading image:', error);
            return false;
        }
    }

    public async executeShellCommand(command: string, userID: string): Promise<string> {
        if (!this.config.features.shellAccess) {
            throw new Error('Shell access is disabled');
        }

        // Security check
        const blacklistedCommands = ['rm -rf', 'format', 'del', 'shutdown', 'reboot', 'passwd', 'sudo rm'];
        if (blacklistedCommands.some(blocked => command.toLowerCase().includes(blocked))) {
            throw new Error('This command is not allowed for security reasons');
        }

        return new Promise((resolve, reject) => {
            exec(command, { 
                timeout: this.config.security.maxShellTimeout || 30000 
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout || stderr || 'Command executed successfully');
                }
            });
        });
    }

    public async installCommand(sourceUrl: string, commandName?: string): Promise<any> {
        const command = await this.commandManager.installCommand(sourceUrl, commandName);
        
        // Save to database
        this.database.createCommand(command);
        
        // Reload commands
        await this.loadCommands();
        
        return command;
    }

    public async deleteCommand(commandId: string): Promise<boolean> {
        const command = this.database.getCommand && this.database.getCommand(commandId);
        if (!command) return false;

        // Delete file
        await this.commandManager.deleteCommand(command.file_path);
        
        // Remove from database
        this.database.deleteCommand(commandId);
        
        // Reload commands
        await this.loadCommands();
        
        return true;
    }

    public getCommands(): Map<string, any> {
        return this.commands;
    }

    public getDatabase(): SQLiteDatabase {
        return this.database;
    }

    public getGeminiService(): GeminiService {
        return this.geminiService;
    }

    public getUptimeService(): UptimeService {
        return this.uptimeService;
    }

    public isConnected(): boolean {
        return this.isLoggedIn && this.api !== null;
    }

    public async testAuthentication(): Promise<boolean> {
        if (!this.api) return false;
        
        try {
            return new Promise((resolve) => {
                this.api?.getCurrentUserID();
                resolve(true);
            });
        } catch {
            return false;
        }
    }

    public updateConfig(newConfig: Partial<BotConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Update Gemini service config
        if (newConfig.gemini) {
            this.geminiService.updateConfig(newConfig.gemini);
        }
    }

    public stop(): void {
        this.isLoggedIn = false;
        this.api = null;
        this.uptimeService.stop();
        this.database.close();
        this.emit('stopped');
        console.log('🛑 Bot stopped');
    }
}
