import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";

export class GeminiService {
    private ai: GoogleGenAI;
    private model: string;
    private primaryModel: string;
    private temperature: number;
    private enabled: boolean;
    private fallbackModels: string[];
    private currentModelIndex: number;
    private rateLimitThreshold: number;
    private requestCount: number;
    private lastResetTime: number;
    private modelCooldowns: Map<string, number>;
    private lastFallbackTime: number;

    constructor(config: {
        apiKey: string;
        model?: string;
        temperature?: number;
        enabled?: boolean;
        fallbackModels?: string[];
        rateLimitThreshold?: number;
    }) {
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
        this.primaryModel = config.model || "gemini-2.5-pro";
        this.model = this.primaryModel;
        this.temperature = config.temperature || 0.7;
        this.enabled = config.enabled !== false;
        this.fallbackModels = config.fallbackModels || [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-pro"
        ];
        this.currentModelIndex = -1; // -1 means using primary model
        this.rateLimitThreshold = config.rateLimitThreshold || 100;
        this.requestCount = 0;
        this.lastResetTime = Date.now();
        this.modelCooldowns = new Map();
        this.lastFallbackTime = 0;
    }

    private checkRateLimit(): boolean {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        
        if (now - this.lastResetTime > hourInMs) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }
        
        return this.requestCount < this.rateLimitThreshold;
    }

    private incrementRequestCount(): void {
        this.requestCount++;
    }

    private switchToFallbackModel(): boolean {
        const now = Date.now();
        const cooldownPeriod = 10 * 60 * 1000; // 10 minutes

        // Check if we can return to primary model
        if (this.currentModelIndex >= 0 && 
            now - this.lastFallbackTime > cooldownPeriod) {
            console.log(`🔄 Cooldown period over, returning to primary model: ${this.primaryModel}`);
            this.model = this.primaryModel;
            this.currentModelIndex = -1;
            return true;
        }

        // Find next available fallback model
        for (let i = this.currentModelIndex + 1; i < this.fallbackModels.length; i++) {
            const fallbackModel = this.fallbackModels[i];
            const lastCooldown = this.modelCooldowns.get(fallbackModel) || 0;
            
            if (now - lastCooldown > cooldownPeriod) {
                console.log(`🔄 Switching to fallback model: ${fallbackModel} (was using: ${this.model})`);
                this.model = fallbackModel;
                this.currentModelIndex = i;
                this.lastFallbackTime = now;
                return true;
            }
        }

        // No fallback available
        console.error('❌ All Gemini models are rate limited');
        return false;
    }

    private handleRateLimitError(): void {
        const now = Date.now();
        
        // Record cooldown for current model
        this.modelCooldowns.set(this.model, now);
        
        // Try to switch to fallback
        if (!this.switchToFallbackModel()) {
            throw new Error('ALL_MODELS_RATE_LIMITED');
        }
    }

    async generateResponse(prompt: string, systemInstruction?: string): Promise<string> {
        if (!this.enabled) {
            throw new Error("Gemini AI is disabled");
        }

        if (!this.checkRateLimit()) {
            throw new Error("Rate limit exceeded");
        }

        this.incrementRequestCount();

        // Check if we can return to primary model
        this.switchToFallbackModel();

        try {
            const config: any = {
                model: this.model,
                contents: prompt,
            };

            if (systemInstruction) {
                config.config = {
                    systemInstruction,
                    temperature: this.temperature,
                };
            }

            const response = await this.ai.models.generateContent(config);
            return response.text || "I couldn't generate a response.";
        } catch (error: any) {
            console.error(`Gemini API error (${this.model}):`, error.message);
            
            // Handle 429 rate limit errors
            if (error.message.includes('429') || error.status === 429) {
                try {
                    this.handleRateLimitError();
                    // Retry with fallback model
                    return await this.generateResponse(prompt, systemInstruction);
                } catch (fallbackError: any) {
                    if (fallbackError.message === 'ALL_MODELS_RATE_LIMITED') {
                        throw new Error('⚠️ All AI models are rate limited. Please try again in 10 minutes.');
                    }
                    throw fallbackError;
                }
            }
            
            throw new Error(`AI response failed: ${error.message}`);
        }
    }

    async analyzeImage(imageBuffer: Buffer, prompt?: string): Promise<string> {
        if (!this.enabled) {
            throw new Error("Gemini AI is disabled");
        }

        if (!this.checkRateLimit()) {
            throw new Error("Rate limit exceeded");
        }

        this.incrementRequestCount();

        // Use vision-capable model (prefer pro for image analysis)
        const visionModel = this.model.includes('pro') ? this.model : 'gemini-2.5-pro';

        try {
            const analysisPrompt = prompt || "Analyze this image in detail and describe its key elements, context, and any notable aspects.";
            
            const contents = [
                {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: "image/jpeg",
                    },
                },
                analysisPrompt
            ];

            const response = await this.ai.models.generateContent({
                model: visionModel,
                contents: contents,
            });

            return response.text || "I couldn't analyze this image.";
        } catch (error: any) {
            console.error(`Image analysis error (${visionModel}):`, error.message);
            
            if (error.message.includes('429') || error.status === 429) {
                try {
                    this.handleRateLimitError();
                    // Retry with fallback model
                    return await this.analyzeImage(imageBuffer, prompt);
                } catch (fallbackError: any) {
                    if (fallbackError.message === 'ALL_MODELS_RATE_LIMITED') {
                        throw new Error('⚠️ All AI models are rate limited. Image analysis unavailable for 10 minutes.');
                    }
                    throw fallbackError;
                }
            }
            
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    async generateStructuredResponse<T>(
        prompt: string, 
        schema: any, 
        systemInstruction?: string
    ): Promise<T> {
        if (!this.enabled) {
            throw new Error("Gemini AI is disabled");
        }

        if (!this.checkRateLimit()) {
            throw new Error("Rate limit exceeded");
        }

        this.incrementRequestCount();

        // Use pro model for structured responses when available
        const structuredModel = this.model.includes('pro') ? this.model : 'gemini-2.5-pro';

        try {
            const response = await this.ai.models.generateContent({
                model: structuredModel,
                config: {
                    systemInstruction: systemInstruction || "Respond with valid JSON only.",
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: this.temperature,
                },
                contents: prompt,
            });

            const rawJson = response.text;
            if (!rawJson) {
                throw new Error("Empty response from model");
            }

            return JSON.parse(rawJson);
        } catch (error: any) {
            console.error(`Structured response error (${structuredModel}):`, error.message);
            
            if (error.message.includes('429') || error.status === 429) {
                try {
                    this.handleRateLimitError();
                    // Retry with fallback model
                    return await this.generateStructuredResponse(prompt, schema, systemInstruction);
                } catch (fallbackError: any) {
                    if (fallbackError.message === 'ALL_MODELS_RATE_LIMITED') {
                        throw new Error('⚠️ All AI models are rate limited. Structured responses unavailable for 10 minutes.');
                    }
                    throw fallbackError;
                }
            }
            
            throw new Error(`Structured response failed: ${error.message}`);
        }
    }

    async convertNaturalLanguageToCommand(
        input: string,
        availableCommands: string[]
    ): Promise<{ command: string; args: string[]; confidence: number }> {
        const systemInstruction = `You are a command parser. Convert natural language to bot commands.
Available commands: ${availableCommands.join(', ')}
Respond with JSON containing: command (string), args (array), confidence (0-1)`;

        const schema = {
            type: "object",
            properties: {
                command: { type: "string" },
                args: { type: "array", items: { type: "string" } },
                confidence: { type: "number", minimum: 0, maximum: 1 }
            },
            required: ["command", "args", "confidence"]
        };

        try {
            return await this.generateStructuredResponse(input, schema, systemInstruction);
        } catch (error) {
            return {
                command: "",
                args: [],
                confidence: 0
            };
        }
    }

    updateConfig(config: Partial<{
        model: string;
        temperature: number;
        enabled: boolean;
        rateLimitThreshold: number;
    }>): void {
        if (config.model !== undefined) this.model = config.model;
        if (config.temperature !== undefined) this.temperature = config.temperature;
        if (config.enabled !== undefined) this.enabled = config.enabled;
        if (config.rateLimitThreshold !== undefined) this.rateLimitThreshold = config.rateLimitThreshold;
    }

    getUsageStats() {
        return {
            requestCount: this.requestCount,
            rateLimitThreshold: this.rateLimitThreshold,
            usagePercentage: (this.requestCount / this.rateLimitThreshold) * 100,
            enabled: this.enabled,
            model: this.model,
            primaryModel: this.primaryModel,
            currentModelIndex: this.currentModelIndex,
            isUsingFallback: this.currentModelIndex >= 0,
            fallbackModels: this.fallbackModels,
            modelCooldowns: Object.fromEntries(this.modelCooldowns)
        };
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.generateResponse("Hello, respond with 'OK' if you can see this.");
            return response.toLowerCase().includes('ok');
        } catch (error) {
            console.error('Gemini connection test failed:', error.message);
            return false;
        }
    }
}
