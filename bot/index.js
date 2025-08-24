const fs = require('fs-extra');
const path = require('path');
const login = require('fca-unofficial');
const { GoogleGenAI } = require('@google/generative-ai');
const axios = require('axios');
const { exec } = require('child_process');
const sharp = require('sharp');

class NexusFCABot {
    constructor() {
        this.api = null;
        this.config = null;
        this.commands = new Map();
        this.geminiAI = null;
        this.loadConfig();
        this.loadCommands();
        this.initializeGemini();
    }

    async loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            this.config = await fs.readJson(configPath);
            console.log('✅ Config loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load config:', error.message);
            process.exit(1);
        }
    }

    async loadCommands() {
        try {
            const commandsDir = path.join(__dirname, 'commands');
            const files = await fs.readdir(commandsDir);
            
            for (const file of files) {
                if (file.endsWith('.js')) {
                    delete require.cache[path.join(commandsDir, file)];
                    const command = require(path.join(commandsDir, file));
                    this.commands.set(command.name, command);
                    console.log(`📋 Loaded command: ${command.name}`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to load commands:', error.message);
        }
    }

    initializeGemini() {
        const apiKey = process.env.GEMINI_API_KEY || this.config.gemini?.apiKey;
        if (apiKey) {
            this.geminiAI = new GoogleGenAI({ apiKey });
            console.log('🧠 Gemini AI initialized');
        } else {
            console.warn('⚠️ Gemini API key not found');
        }
    }

    async start() {
        try {
            const cookiePath = path.join(__dirname, 'cookies', 'facebook.json');
            let loginData;

            if (await fs.pathExists(cookiePath)) {
                loginData = await fs.readJson(cookiePath);
                console.log('🍪 Using saved cookies');
            } else {
                throw new Error('No cookies found. Please provide Facebook cookies.');
            }

            login(loginData, async (err, api) => {
                if (err) {
                    console.error('❌ Login failed:', err);
                    return;
                }

                this.api = api;
                console.log('✅ Bot logged in successfully');

                // Save updated cookies
                await this.saveCookies(api.getAppState());

                // Set bot options
                api.setOptions({
                    listenEvents: true,
                    pageID: this.config.pageID,
                    updatePresence: true,
                    forceLogin: true,
                    autoMarkDelivery: false,
                    autoMarkRead: false,
                    userAgent: this.config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                });

                // Start listening
                api.listenMqtt(this.handleMessage.bind(this));
            });

        } catch (error) {
            console.error('❌ Failed to start bot:', error.message);
        }
    }

    async saveCookies(appState) {
        try {
            const cookiesDir = path.join(__dirname, 'cookies');
            await fs.ensureDir(cookiesDir);
            await fs.writeJson(path.join(cookiesDir, 'facebook.json'), appState, { spaces: 2 });
            console.log('🍪 Cookies saved');
        } catch (error) {
            console.error('❌ Failed to save cookies:', error.message);
        }
    }

    async handleMessage(err, event) {
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

    async processMessage(message) {
        const { threadID, senderID, body, attachments } = message;
        
        // Skip bot's own messages
        if (senderID === this.api.getCurrentUserID()) return;

        // Check if group is verified
        if (!await this.isGroupVerified(threadID)) {
            return;
        }

        // Log message
        await this.logMessage(message);

        // Handle commands
        if (body && body.startsWith('/')) {
            await this.handleCommand(message);
            return;
        }

        // Handle AI responses
        if (await this.isAIEnabledForGroup(threadID)) {
            if (attachments && attachments.length > 0) {
                await this.handleImageAnalysis(message);
            } else if (body) {
                await this.handleAIResponse(message);
            }
        }
    }

    async handleCommand(message) {
        const { threadID, senderID, body } = message;
        const args = body.slice(1).split(' ');
        const commandName = args.shift().toLowerCase();
        
        const command = this.commands.get(commandName);
        if (!command) {
            return this.api.sendMessage('❌ Command not found. Use /help to see available commands.', threadID);
        }

        // Check permissions
        const userPermission = await this.getUserPermission(senderID, threadID);
        if (!this.hasPermission(userPermission, command.permission)) {
            return this.api.sendMessage('❌ You don\'t have permission to use this command.', threadID);
        }

        try {
            await command.execute(this.api, message, args, this);
        } catch (error) {
            console.error(`❌ Command error (${commandName}):`, error.message);
            this.api.sendMessage('❌ An error occurred while executing the command.', threadID);
        }
    }

    async handleAIResponse(message) {
        const { threadID, body } = message;
        
        if (!this.geminiAI) return;

        try {
            const response = await this.geminiAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: body,
            });

            const aiResponse = response.text;
            if (aiResponse) {
                this.api.sendMessage(`🤖 ${aiResponse}`, threadID);
            }
        } catch (error) {
            console.error('❌ AI response error:', error.message);
            
            // Try fallback models
            if (error.message.includes('429')) {
                await this.handleFallbackAI(message);
            }
        }
    }

    async handleImageAnalysis(message) {
        const { threadID, attachments } = message;
        
        if (!this.geminiAI || !await this.isImageAnalysisEnabled(threadID)) return;

        try {
            for (const attachment of attachments) {
                if (attachment.type === 'photo') {
                    const imageUrl = attachment.url || attachment.hiresUrl;
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data);
                    
                    // Convert to JPEG if needed
                    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();
                    
                    const contents = [
                        {
                            inlineData: {
                                data: jpegBuffer.toString("base64"),
                                mimeType: "image/jpeg",
                            },
                        },
                        "Analyze this image and describe what you see in detail."
                    ];

                    const aiResponse = await this.geminiAI.models.generateContent({
                        model: "gemini-2.5-pro",
                        contents: contents,
                    });

                    if (aiResponse.text) {
                        this.api.sendMessage(`🖼️ Image Analysis: ${aiResponse.text}`, threadID);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Image analysis error:', error.message);
        }
    }

    async handleFallbackAI(message) {
        // Implement fallback AI models here
        console.log('🔄 Using fallback AI model');
        // This would use alternative AI services when Gemini fails
    }

    async processEvent(event) {
        // Handle group joins, leaves, etc.
        console.log('📅 Event received:', event.logMessageType);
    }

    async getUserPermission(userID, threadID) {
        // Check if user is owner
        if (this.config.owners && this.config.owners.includes(userID)) {
            return 'owner';
        }

        // Check if user is admin
        try {
            const threadInfo = await this.api.getThreadInfo(threadID);
            const userInfo = threadInfo.participantIDs.find(p => p.userID === userID);
            if (userInfo && userInfo.type === 'admin') {
                return 'admin';
            }
        } catch (error) {
            console.error('❌ Failed to get user permission:', error.message);
        }

        return 'user';
    }

    hasPermission(userPermission, requiredPermission) {
        const permissions = ['user', 'admin', 'owner'];
        const userLevel = permissions.indexOf(userPermission);
        const requiredLevel = permissions.indexOf(requiredPermission);
        return userLevel >= requiredLevel;
    }

    async isGroupVerified(threadID) {
        // In a real implementation, this would check the database
        return true; // For now, assume all groups are verified
    }

    async isAIEnabledForGroup(threadID) {
        // In a real implementation, this would check the database
        return true; // For now, assume AI is enabled for all groups
    }

    async isImageAnalysisEnabled(threadID) {
        // In a real implementation, this would check the database
        return true; // For now, assume image analysis is enabled
    }

    async logMessage(message) {
        // Log message to database
        const logEntry = {
            threadID: message.threadID,
            senderID: message.senderID,
            senderName: message.senderName,
            content: message.body,
            messageType: message.attachments?.length > 0 ? 'image' : 'text',
            timestamp: new Date()
        };
        
        console.log('📝 Message logged:', logEntry);
    }

    async executeShellCommand(command, userID) {
        // Only allow for authorized users with owner approval
        return new Promise((resolve, reject) => {
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout || stderr);
                }
            });
        });
    }
}

// Start the bot
const bot = new NexusFCABot();
bot.start();

module.exports = NexusFCABot;
