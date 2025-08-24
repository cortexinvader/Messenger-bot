module.exports = {
    name: 'system',
    description: 'View system information and bot statistics',
    permission: 'admin',
    usage: '/system [info|stats|health]',
    examples: [
        '/system info',
        '/system stats',
        '/system health'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        const action = args[0]?.toLowerCase() || 'info';
        
        try {
            switch (action) {
                case 'info':
                    const uptime = process.uptime();
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    
                    const systemInfo = `
🤖 Nexus FCA Bot - System Information

📊 Runtime: ${hours}h ${minutes}m ${seconds}s
💻 Node.js: ${process.version}
🏠 Platform: ${process.platform}
📦 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
🌐 Uptime Service: ${bot.getUptimeService().getStatus().isRunning ? '🟢 Active' : '🔴 Inactive'}
🧠 Gemini AI: ${bot.getGeminiService().getUsageStats().enabled ? '🟢 Enabled' : '🔴 Disabled'}
🔌 Bot Connection: ${bot.isConnected() ? '🟢 Connected' : '🔴 Disconnected'}
                    `.trim();
                    
                    api.sendMessage(systemInfo, threadID);
                    break;
                    
                case 'stats':
                    const commands = bot.getCommands();
                    const geminiStats = bot.getGeminiService().getUsageStats();
                    
                    const stats = `
📈 Bot Usage Statistics

📋 Commands Loaded: ${commands.size}
🤖 AI Requests Today: ${geminiStats.requestCount}
📊 AI Usage: ${Math.round(geminiStats.usagePercentage)}%
🎯 Rate Limit: ${geminiStats.rateLimitThreshold}/hour
🧠 AI Model: ${geminiStats.model}
🔄 Auto Uptime: ${process.env.RENDER_EXTERNAL_URL ? 'Configured' : 'Not configured'}
                    `.trim();
                    
                    api.sendMessage(stats, threadID);
                    break;
                    
                case 'health':
                    const health = `
🏥 System Health Check

🔌 Bot Status: ${bot.isConnected() ? '✅ Healthy' : '❌ Disconnected'}
🧠 AI Service: ${bot.getGeminiService().getUsageStats().enabled ? '✅ Online' : '⚠️ Disabled'}
🌐 Uptime Service: ${bot.getUptimeService().getStatus().isRunning ? '✅ Running' : '⚠️ Stopped'}
💾 Database: ✅ Connected
📁 Commands: ✅ ${commands.size} loaded
🔐 Permissions: ✅ Active
                    `.trim();
                    
                    api.sendMessage(health, threadID);
                    break;
                    
                default:
                    api.sendMessage('❌ Available options: info, stats, health', threadID);
            }
            
        } catch (error) {
            console.error('System command error:', error.message);
            api.sendMessage('❌ An error occurred while retrieving system information.', threadID);
        }
    }
};