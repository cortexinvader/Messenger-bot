// This is a template for creating new commands
// Copy this file and modify it to create your own commands

module.exports = {
    // Required: Command name (used to trigger the command)
    name: 'example',
    
    // Required: Brief description of what the command does
    description: 'An example command template for developers',
    
    // Required: Permission level required to use this command
    // Options: 'user', 'admin', 'owner'
    permission: 'user',
    
    // Optional: Usage information
    usage: '/example [optional_parameter]',
    
    // Optional: Examples of how to use the command
    examples: [
        '/example',
        '/example hello world'
    ],
    
    // Optional: Command aliases
    aliases: ['ex', 'sample'],
    
    // Optional: Cooldown in milliseconds
    cooldown: 5000,
    
    // Required: Main function that executes when command is called
    async execute(api, message, args, bot) {
        const { threadID, senderID, senderName } = message;
        
        // Your command logic here
        try {
            // Example: Simple response
            if (args.length === 0) {
                return api.sendMessage('Hello! This is an example command.', threadID);
            }
            
            // Example: Echo back the arguments
            const userInput = args.join(' ');
            api.sendMessage(`You said: ${userInput}`, threadID);
            
            // Example: Send a formatted message
            const responseText = `
🤖 Example Command Response

👤 User: ${senderName}
💬 Input: ${userInput}
🕒 Time: ${new Date().toLocaleString()}
            `.trim();
            
            api.sendMessage(responseText, threadID);
            
        } catch (error) {
            console.error('Example command error:', error.message);
            api.sendMessage('❌ An error occurred while executing the example command.', threadID);
        }
    }
};

/*
Command Development Guidelines:

1. Always include error handling with try-catch blocks
2. Validate user inputs before processing
3. Use appropriate permission levels for security
4. Keep response messages concise but informative
5. Use emojis sparingly for better readability
6. Test your command thoroughly before deployment
7. Consider rate limiting for resource-intensive commands
8. Document your command with clear usage examples

Available API methods:
- api.sendMessage(message, threadID)
- api.sendTypingIndicator(threadID)
- api.markAsRead(threadID)
- api.getThreadInfo(threadID)
- api.getUserInfo(userID)
- api.setTitle(title, threadID)
- api.addUserToGroup(userID, threadID)
- api.removeUserFromGroup(userID, threadID)

Available bot methods:
- bot.getUserPermission(userID, threadID)
- bot.hasPermission(userPermission, requiredPermission)
- bot.executeShellCommand(command, userID) // Admin only
- bot.geminiAI.models.generateContent() // AI responses
*/
