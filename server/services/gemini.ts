import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";

export class GeminiService {
    private ai: GoogleGenAI;
    private model: string;
    private temperature: number;
    private enabled: boolean;
    private fallbackModels: string[];
    private rateLimitThreshold: number;
    private requestCount: number;
    private lastResetTime: number;

    constructor(config: {
        apiKey: string;
        model?: string;
        temperature?: number;
        enabled?: boolean;
        fallbackModels?: string[];
        rateLimitThreshold?: number;
    }) {
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
        this.model = config.model || "gemini-2.5-flash";
        this.temperature = config.temperature || 0.7;
        this.enabled = config.enabled !== false;
        this.fallbackModels = config.fallbackModels || ["gemini-pro"];
        this.rateLimitThreshold = config.rateLimitThreshold || 100;
        this.requestCount = 0;
        this.lastResetTime = Date.now();
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

    async generateResponse(prompt: string, systemInstruction?: string): Promise<string> {
        if (!this.enabled) {
            throw new Error("Gemini AI is disabled");
        }

        if (!this.checkRateLimit()) {
            throw new Error("Rate limit exceeded");
        }

        this.incrementRequestCount();

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
        } catch (error) {
            console.error('Gemini API error:', error.message);
            
            // Handle 429 rate limit errors
            if (error.message.includes('429')) {
                throw new Error('RATE_LIMIT_EXCEEDED');
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
                model: "gemini-2.5-pro",
                contents: contents,
            });

            return response.text || "I couldn't analyze this image.";
        } catch (error) {
            console.error('Image analysis error:', error.message);
            
            if (error.message.includes('429')) {
                throw new Error('RATE_LIMIT_EXCEEDED');
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

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-pro",
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
        } catch (error) {
            console.error('Structured response error:', error.message);
            
            if (error.message.includes('429')) {
                throw new Error('RATE_LIMIT_EXCEEDED');
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
            model: this.model
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
