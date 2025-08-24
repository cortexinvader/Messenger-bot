module.exports = {
    name: 'ai',
    description: 'Toggle AI responses and image analysis for the current group',
    permission: 'admin',
    usage: '/ai <on|off|status> [image]',
    examples: [
        '/ai on',
        '/ai off', 
        '/ai status',
        '/ai on image',
        '/ai off image'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Usage: /ai <on|off|status> [image]', threadID);
        }
        
        const action = args[0].toLowerCase();
        const feature = args[1]?.toLowerCase();
        
        try {
            const database = bot.getDatabase();
            let group = database.getGroupByThreadId(threadID);
            
            // Create group if it doesn't exist
            if (!group) {
                const { randomUUID } = require('crypto');
                const threadInfo = await new Promise((resolve) => {
                    api.getThreadInfo(threadID, (err, info) => {
                        resolve(err ? null : info);
                    });
                });
                
                group = {
                    id: randomUUID(),
                    threadId: threadID,
                    name: threadInfo?.name || 'Unknown Group',
                    members: threadInfo?.participantIDs?.length || 0,
                    verified: true, // Auto-verify for AI commands
                    ai_enabled: false,
                    image_analysis_enabled: false
                };
                database.createGroup(group);
            }
            
            switch (action) {
                case 'on':
                    if (feature === 'image') {
                        database.updateGroup(group.id, { image_analysis_enabled: 1 });
                        api.sendMessage('🖼️ Image analysis enabled for this group!', threadID);
                    } else {
                        database.updateGroup(group.id, { ai_enabled: 1 });
                        api.sendMessage('🤖 AI responses enabled for this group!', threadID);
                    }
                    break;
                    
                case 'off':
                    if (feature === 'image') {
                        database.updateGroup(group.id, { image_analysis_enabled: 0 });
                        api.sendMessage('🖼️ Image analysis disabled for this group.', threadID);
                    } else {
                        database.updateGroup(group.id, { ai_enabled: 0 });
                        api.sendMessage('🤖 AI responses disabled for this group.', threadID);
                    }
                    break;
                    
                case 'status':
                    const updatedGroup = database.getGroupByThreadId(threadID);
                    const statusText = `
🤖 AI Configuration Status

Group: ${updatedGroup?.name || 'Unknown'}
AI Responses: ${updatedGroup?.ai_enabled ? '🟢 Enabled' : '🔴 Disabled'}
Image Analysis: ${updatedGroup?.image_analysis_enabled ? '🟢 Enabled' : '🔴 Disabled'}
Group Verified: ${updatedGroup?.verified ? '✅ Yes' : '❌ No'}

Use "/ai on" or "/ai off" to toggle AI responses
Use "/ai on image" or "/ai off image" to toggle image analysis
                    `.trim();
                    api.sendMessage(statusText, threadID);
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: on, off, status', threadID);
            }
            
        } catch (error) {
            console.error('AI command error:', error.message);
            api.sendMessage('❌ An error occurred while managing AI settings.', threadID);
        }
    }
};