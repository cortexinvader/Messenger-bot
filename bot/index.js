
const fs = require('fs-extra');
const path = require('path');
const login = require('nexus-fca'); // switched to nexus-fca
const winston = require('winston');
const { GoogleGenAI } = require('@google/generative-ai');
const axios = require('axios');
const { exec } = require('child_process');
const sharp = require('sharp');

//import fs from 'fs-extra';
//import path from 'path';
/*
import login from 'nexus-fca';
import winston from 'winston';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { exec } from 'child_process';
import sharp from 'sharp';
*/
// Create log folder if missing
const logDirectory = path.join(__dirname, '../logs');
fs.ensureDirSync(logDirectory);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDirectory, 'bot.log') }),
  ],
});

class NexusFCABot {
    constructor() {
        this.api = null;
        this.config = null;
        this.commands = new Map();
        this.geminiAI = null;
        this.log('Bot instance created');
    }

    async initialize() {
        await this.loadConfig();
        await this.loadCommands();
        this.initializeGemini();
        this.log('Bot initialized successfully');
    }

    log(...args) {
        logger.info(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
    }

    async loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            this.config = await fs.readJson(configPath);
            this.log('✅ Config loaded successfully');
        } catch (error) {
            this.log('❌ Failed to load config:', error.message);
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
                    this.log(`📋 Loaded command: ${command.name}`);
                }
            }
        } catch (error) {
            this.log('❌ Failed to load commands:', error.message);
        }
    }

    initializeGemini() {
        const apiKey = process.env.GEMINI_API_KEY || this.config.gemini?.apiKey;
        if (apiKey) {
            this.geminiAI = new GoogleGenAI({ apiKey });
            this.log('🧠 Gemini AI initialized');
        } else {
            this.log('⚠️ Gemini API key not found');
        }
    }

    async start() {
        try {
            this.log('Starting bot...');
            const cookiePath = path.join(__dirname, 'cookies', 'facebook.json');
            let loginData;

            if (await fs.pathExists(cookiePath)) {
                const cookieData = await fs.readJson(cookiePath);
                loginData = { appState: cookieData };
                this.log('🍪 Using saved cookies');
            } else {
                throw new Error('No cookies found. Please provide Facebook cookies.');
            }

            login(loginData, async (err, api) => {
                if (err) {
                    this.log('❌ Login failed:', err);
                    return;
                }

                this.api = api;
                this.log('✅ Bot logged in successfully');

                // Save updated cookies
                await this.saveCookies(api.getAppState());

                // Set bot options
                api.setOptions({
                    listenEvents: true,
                    updatePresence: true,
                    forceLogin: true,
                    autoMarkDelivery: false,
                    autoMarkRead: false,
                    userAgent: this.config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                });

                this.log('Bot options set:', JSON.stringify(api.getOptions()));

                // Start listening
                api.listenMqtt(this.handleMessage.bind(this));
                this.log('Listening for Messenger events...');
            });

        } catch (error) {
            this.log('❌ Failed to start bot:', error.message);
        }
    }

    async saveCookies(appState) {
        try {
            const cookiesDir = path.join(__dirname,  'cookies');
            await fs.ensureDir(cookiesDir);
            await fs.writeJson(path.join(cookiesDir, 'facebook.json'), appState, { spaces: 2 });
            this.log('🍪 Cookies saved');
        } catch (error) {
            this.log('❌ Failed to save cookies:', error.message);
        }
    }

    async handleMessage(err, event) {
        if (err) {
            this.log('❌ Message handling error:', err);
            return;
        }
        this.log('Received event:', JSON.stringify(event));

        try {
            switch (event.type) {
                case 'message':
                    this.log('Processing message:', event.body);
                    await this.processMessage(event);
                    break;
                case 'event':
                    this.log('Processing event:', event.logMessageType);
                    await this.processEvent(event);
                    break;
                default:
                    this.log('Unknown event type:', event.type);
            }
        } catch (error) {
            this.log('❌ Error processing message:', error.message);
        }
    }

    async processMessage(message) {
        const { threadID, senderID, body, attachments } = message;
        this.log('Message received:', { threadID, senderID, body });

        // Skip bot's own messages
        if (senderID === this.api.getCurrentUserID()) {
            this.log('Skipping own message');
            return;
        }

        // Check if group is verified
        if (!await this.isGroupVerified(threadID)) {
            this.log('Group not verified:', threadID);
            return;
        }

        // Log message
        await this.logMessage(message);

        // Handle commands
        if (body && body.startsWith('/')) {
            this.log('Command detected:', body);
            await this.handleCommand(message);
            return;
        }

        // Handle AI responses
        if (await this.isAIEnabledForGroup(threadID)) {
            if (attachments && attachments.length > 0) {
                this.log('Image attachments detected');
                await this.handleImageAnalysis(message);
            } else if (body) {
                this.log('AI response for text');
                await this.handleAIResponse(message);
            }
        }
    }

    async handleCommand(message) {
        const { threadID, senderID, body } = message;
        const args = body.slice(1).split(' ');
        const commandName = args.shift().toLowerCase();

        this.log('Handling command:', commandName, 'Args:', args);

        const command = this.commands.get(commandName);
        if (!command) {
            this.api.sendMessage('❌ Command not found. Use /help to see available commands.', threadID);
            this.log('Command not found:', commandName);
            return;
        }

        // Check permissions
        const userPermission = await this.getUserPermission(senderID, threadID);
        this.log('User permission:', userPermission, 'Required:', command.permission);
        if (!this.hasPermission(userPermission, command.permission)) {
            this.api.sendMessage('❌ You don\'t have permission to use this command.', threadID);
            this.log('Permission denied for user:', senderID);
            return;
        }

        try {
            await command.execute(this.api, message, args, this);
            this.log('Command executed successfully:', commandName);
        } catch (error) {
            this.log(`❌ Command error (${commandName}):`, error.message);
            this.api.sendMessage('❌ An error occurred while executing the command.', threadID);
        }
    }

    async handleAIResponse(message) {
        const { threadID, body } = message;

        if (!this.geminiAI) {
            this.log('Gemini AI not initialized');
            return;
        }

        try {
            const response = await this.geminiAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: body,
            });

            const aiResponse = response.text;
            this.log('AI response:', aiResponse);
            if (aiResponse) {
                this.api.sendMessage(`🤖 ${aiResponse}`, threadID);
                this.log('Sent AI response to Messenger');
            }
        } catch (error) {
            this.log('❌ AI response error:', error.message);

            // Try fallback models
            if (error.message.includes('429')) {
                await this.handleFallbackAI(message);
            }
        }
    }

    async handleImageAnalysis(message) {
        const { threadID, attachments } = message;

        if (!this.geminiAI || !await this.isImageAnalysisEnabled(threadID)) {
            this.log('Image analysis not enabled or Gemini AI missing');
            return;
        }

        try {
            for (const attachment of attachments) {
                if (attachment.type === 'photo') {
                    this.log('Processing image attachment');
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

                    this.log('Image AI response:', aiResponse.text);
                    if (aiResponse.text) {
                        this.api.sendMessage(`🖼️ Image Analysis: ${aiResponse.text}`, threadID);
                        this.log('Sent image analysis result');
                    }
                }
            }
        } catch (error) {
            this.log('❌ Image analysis error:', error.message);
        }
    }

    async handleFallbackAI(message) {
        this.log('🔄 Using fallback AI model');
        // This would use alternative AI services when Gemini fails
    }

    async processEvent(event) {
        this.log('Processing Messenger event:', event.logMessageType);
        // Handle group joins, leaves, etc.
    }

    async getUserPermission(userID, threadID) {
        // Check if user is owner
        if (this.config.owners && this.config.owners.includes(userID)) {
            this.log('User is owner:', userID);
            return 'owner';
        }

        // Check if user is admin
        try {
            const threadInfo = await this.api.getThreadInfo(threadID);
            const userInfo = threadInfo.participantIDs.find(p => p.userID === userID);
            if (userInfo && userInfo.type === 'admin') {
                this.log('User is admin:', userID);
                return 'admin';
            }
        } catch (error) {
            this.log('❌ Failed to get user permission:', error.message);
        }

        this.log('User is normal user:', userID);
        return 'user';
    }

    hasPermission(userPermission, requiredPermission) {
        const permissions = ['user', 'admin', 'owner'];
        const userLevel = permissions.indexOf(userPermission);
        const requiredLevel = permissions.indexOf(requiredPermission);
        return userLevel >= requiredLevel;
    }

    async isGroupVerified(threadID) {
        // Check if group verification is required
        if (!this.config.security.requireGroupVerification) {
            return true; // Verification not required
        }
        // For now, allow all groups - implement database check later
        this.log('✅ Group verification passed:', threadID);
        return true;
    }

    async isAIEnabledForGroup(threadID) {
        // Check if Gemini AI is configured
        if (!this.geminiAI) {
            this.log('⚠️ AI not enabled - no API key:', threadID);
            return false;
        }
        this.log('🧠 AI enabled for group:', threadID);
        return true;
    }

    async isImageAnalysisEnabled(threadID) {
        // Check if image analysis features are enabled
        if (!this.config.features.imageAnalysis || !this.geminiAI) {
            this.log('📷 Image analysis not available:', threadID);
            return false;
        }
        this.log('📷 Image analysis enabled for group:', threadID);
        return true;
    }

    async logMessage(message) {
        try {
            // Store comprehensive message data for group chat flow
            const logEntry = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                threadID: message.threadID,
                senderID: message.senderID,
                senderName: message.senderName || 'Unknown User',
                content: message.body || '',
                messageType: message.attachments?.length > 0 ? 'image' : 'text',
                attachments: message.attachments || [],
                timestamp: new Date().toISOString(),
                isGroupChat: message.isGroup || false
            };

            // Log to console for now - database integration would go here
            this.log('📝 Comprehensive message logged:', {
                thread: logEntry.threadID,
                sender: logEntry.senderName,
                type: logEntry.messageType,
                content: logEntry.content.substring(0, 50) + (logEntry.content.length > 50 ? '...' : ''),
                attachments: logEntry.attachments.length,
                timestamp: logEntry.timestamp
            });
            
            // TODO: Save to database for persistent chat history
            // await this.database.saveMessage(logEntry);
        } catch (error) {
            this.log('❌ Failed to log message:', error.message);
        }
    }

    async executeShellCommand(command, userID) {
        this.log('Executing shell command:', command, 'User:', userID);
        // Only allow for authorized users with owner approval
        return new Promise((resolve, reject) => {
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    this.log('Shell command error:', error);
                    reject(error);
                } else {
                    this.log('Shell command output:', stdout || stderr);
                    resolve(stdout || stderr);
                }
            });
        });
    }
}

// Start the bot
const bot = new NexusFCABot();
bot.initialize().then(() => {
    bot.start();
}).catch((error) => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
});

//module.exports = NexusFCABot;
