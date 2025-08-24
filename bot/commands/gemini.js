module.exports = {
    name: 'gemini',
    description: 'Manage Gemini AI models and fallback system',
    permission: 'admin',
    usage: '/gemini <status|models|switch|reset> [model_name]',
    examples: [
        '/gemini status',
        '/gemini models',
        '/gemini switch gemini-2.5-flash',
        '/gemini reset'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Usage: /gemini <status|models|switch|reset> [model_name]', threadID);
        }
        
        const action = args[0].toLowerCase();
        const geminiService = bot.getGeminiService();
        
        try {
            switch (action) {
                case 'status':
                    const stats = geminiService.getUsageStats();
                    const now = Date.now();
                    
                    let cooldownInfo = '';
                    if (Object.keys(stats.modelCooldowns).length > 0) {
                        cooldownInfo = '\n\n🕒 Model Cooldowns:';
                        for (const [model, cooldownTime] of Object.entries(stats.modelCooldowns)) {
                            const remainingMs = (cooldownTime + 10 * 60 * 1000) - now;
                            const remainingMins = Math.max(0, Math.ceil(remainingMs / 60000));
                            cooldownInfo += `\n• ${model}: ${remainingMins}m remaining`;
                        }
                    }
                    
                    const statusText = `
🤖 Gemini AI Status

Current Model: ${stats.model}${stats.isUsingFallback ? ' (Fallback)' : ' (Primary)'}
Primary Model: ${stats.primaryModel}
Status: ${stats.enabled ? '🟢 Enabled' : '🔴 Disabled'}

📊 Usage Stats:
• Requests: ${stats.requestCount}/${stats.rateLimitThreshold} (${Math.round(stats.usagePercentage)}%)
• Rate Limited: ${stats.isUsingFallback ? 'Yes' : 'No'}

🔄 Fallback Models:
${stats.fallbackModels.map((model, index) => 
    `${index === stats.currentModelIndex ? '→ ' : '  '}${model}`
).join('\n')}${cooldownInfo}
                    `.trim();
                    
                    api.sendMessage(statusText, threadID);
                    break;
                    
                case 'models':
                    const modelsText = `
📋 Available Gemini Models

🏆 Premium Models (Higher Quality):
• gemini-2.5-pro - Best reasoning & complex tasks
• gemini-1.5-pro - Advanced multimodal capabilities

⚡ Fast Models (Lower Cost):
• gemini-2.5-flash - Fast general responses  
• gemini-1.5-flash - Quick multimodal tasks
• gemini-pro - Standard text generation

💡 Features:
• Auto-fallback when rate limited
• 10-minute cooldown per model
• Automatic return to primary model
• Smart model selection for images/JSON
                    `.trim();
                    
                    api.sendMessage(modelsText, threadID);
                    break;
                    
                case 'switch':
                    if (args.length < 2) {
                        return api.sendMessage('❌ Please specify a model: /gemini switch <model_name>', threadID);
                    }
                    
                    const newModel = args[1];
                    const validModels = [
                        'gemini-2.5-pro', 
                        'gemini-2.5-flash',
                        'gemini-1.5-pro',
                        'gemini-1.5-flash',
                        'gemini-pro'
                    ];
                    
                    if (!validModels.includes(newModel)) {
                        return api.sendMessage(`❌ Invalid model. Valid models:\n${validModels.join(', ')}`, threadID);
                    }
                    
                    try {
                        geminiService.updateConfig({ model: newModel });
                        api.sendMessage(`✅ Switched to model: ${newModel}`, threadID);
                    } catch (error) {
                        api.sendMessage(`❌ Failed to switch model: ${error.message}`, threadID);
                    }
                    break;
                    
                case 'reset':
                    try {
                        // Reset to primary model and clear cooldowns
                        const stats = geminiService.getUsageStats();
                        geminiService.updateConfig({ model: stats.primaryModel });
                        
                        api.sendMessage(`🔄 Reset to primary model: ${stats.primaryModel}\n` +
                                      `Cooldowns cleared. AI ready for use!`, threadID);
                    } catch (error) {
                        api.sendMessage(`❌ Failed to reset: ${error.message}`, threadID);
                    }
                    break;
                    
                case 'test':
                    api.sendMessage('🧪 Testing AI connection...', threadID);
                    
                    try {
                        const testSuccess = await geminiService.testConnection();
                        if (testSuccess) {
                            const currentStats = geminiService.getUsageStats();
                            api.sendMessage(`✅ AI test successful!\n` +
                                          `Model: ${currentStats.model}\n` +
                                          `Response time: <1s`, threadID);
                        } else {
                            api.sendMessage('❌ AI test failed. Check your API key and network connection.', threadID);
                        }
                    } catch (error) {
                        api.sendMessage(`❌ AI test error: ${error.message}`, threadID);
                    }
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: status, models, switch, reset, test', threadID);
            }
            
        } catch (error) {
            console.error('Gemini command error:', error.message);
            api.sendMessage('❌ An error occurred while managing Gemini AI.', threadID);
        }
    }
};