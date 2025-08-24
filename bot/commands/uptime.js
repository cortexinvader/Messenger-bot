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
        // Simple uptime status without service dependency
        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        
        try {
            switch (action) {
                case 'status':
                    const statusText = `
🌐 Bot Uptime Status

⏱️ Bot Uptime: ${uptimeHours}h ${uptimeMinutes}m
🟢 Status: Running & Connected
🤖 Bot ID: ${bot.api ? 'Connected' : 'Disconnected'}
📡 Listening: Facebook Messenger
🔧 Commands Loaded: ${bot.commands.size}
                    `.trim();
                    api.sendMessage(statusText, threadID);
                    break;
                    
                case 'start':
                    api.sendMessage('✅ Bot is already running and listening for messages!', threadID);
                    break;
                    
                case 'stop':
                    api.sendMessage('❌ Cannot stop bot from chat command for security reasons.', threadID);
                    break;
                    
                case 'url':
                    api.sendMessage('ℹ️ Bot runs on Replit and doesn\'t need external URL configuration.', threadID);
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