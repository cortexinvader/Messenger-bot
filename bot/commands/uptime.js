module.exports = {
    name: 'uptime',
    description: 'Manage uptime service and view status',
    permission: 'admin',
    usage: '/uptime <status|start|stop|url>',
    examples: [
        '/uptime status',
        '/uptime start',
        '/uptime stop',
        '/uptime url https://example.com'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID, senderID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Usage: /uptime <status|start|stop|url> [new_url]', threadID);
        }
        
        const action = args[0].toLowerCase();
        const uptimeService = bot.getUptimeService();
        
        try {
            switch (action) {
                case 'status':
                    const status = uptimeService.getStatus();
                    const statusText = `
🌐 Uptime Service Status

Status: ${status.isRunning ? '🟢 Running' : '🔴 Stopped'}
Target URL: ${status.url || 'Not configured'}
Environment: ${process.env.RENDER_EXTERNAL_URL ? 'RENDER_EXTERNAL_URL set' : 'No environment URL'}
Ping Interval: 10 seconds
                    `.trim();
                    api.sendMessage(statusText, threadID);
                    break;
                    
                case 'start':
                    uptimeService.start();
                    api.sendMessage('🚀 Uptime service started! Pinging every 10 seconds.', threadID);
                    break;
                    
                case 'stop':
                    uptimeService.stop();
                    api.sendMessage('🛑 Uptime service stopped.', threadID);
                    break;
                    
                case 'url':
                    if (args.length < 2) {
                        return api.sendMessage('❌ Please provide a URL: /uptime url <new_url>', threadID);
                    }
                    
                    const newUrl = args[1];
                    if (!newUrl.startsWith('http')) {
                        return api.sendMessage('❌ Please provide a valid URL starting with http/https', threadID);
                    }
                    
                    // Update environment variable (for this session only)
                    process.env.RENDER_EXTERNAL_URL = newUrl;
                    uptimeService.updateUrl(newUrl);
                    api.sendMessage(`🔄 Uptime URL updated to: ${newUrl}\nService restarted with new URL.`, threadID);
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: status, start, stop, url', threadID);
            }
            
        } catch (error) {
            console.error('Uptime command error:', error.message);
            api.sendMessage('❌ An error occurred while managing uptime service.', threadID);
        }
    }
};