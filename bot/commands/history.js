module.exports = {
    name: 'history',
    description: 'View recent group chat history',
    permission: 'user',
    usage: '/history [count]',
    examples: [
        '/history',
        '/history 20'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        const limit = parseInt(args[0]) || 10;
        
        if (limit > 50) {
            return api.sendMessage('❌ Maximum history limit is 50 messages.', threadID);
        }
        
        try {
            // For now, show recent activity from logs
            // In a full implementation, this would query the database
            const historyText = `
📜 Recent Chat History (Last ${limit} messages)

🔄 Comprehensive message logging is active!
📝 All messages are being stored with:
  • User information
  • Message content  
  • Timestamps
  • Attachment details
  • Message types

💾 Database integration pending for persistent history.
For now, messages are logged to console with full details.
            `.trim();
            
            api.sendMessage(historyText, threadID);
            
        } catch (error) {
            console.error('History command error:', error.message);
            api.sendMessage('❌ Failed to retrieve chat history.', threadID);
        }
    }
};