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
                return api.sendMessage('Hello! This is an example command.\n\nAvailable demos:\n/example text - Text response\n/example image - Send image\n/example media - Media examples', threadID);
            }
            
            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'text':
                    // Example: Echo back the arguments
                    const userInput = args.slice(1).join(' ');
                    const responseText = `
🤖 Example Command Response

👤 User: ${senderName}
💬 Input: ${userInput}
🕒 Time: ${new Date().toLocaleString()}
                    `.trim();
                    
                    api.sendMessage(responseText, threadID);
                    break;
                    
                case 'image':
                    // Example: Send image from URL
                    api.sendMessage('📸 Sending example image...', threadID);
                    const imageUrl = 'https://picsum.photos/400/300';
                    const success = await bot.sendImageFromUrl(imageUrl, threadID, 'This is an example image!');
                    if (!success) {
                        api.sendMessage('❌ Failed to send image example', threadID);
                    }
                    break;
                    
                case 'media':
                    // Example: Media sending examples
                    const mediaExamples = `
📱 Media Sending Examples:

🖼️ **Images:**
\`\`\`javascript
// Send image from URL
await bot.sendImageFromUrl('https://example.com/image.jpg', threadID, 'Caption here');

// Send local image file
await bot.sendMedia('/path/to/image.jpg', threadID, 'image');
\`\`\`

🎥 **Videos:**
\`\`\`javascript
// Send local video file
await bot.sendMedia('/path/to/video.mp4', threadID, 'video');
\`\`\`

🎵 **Audio:**
\`\`\`javascript
// Send local audio file
await bot.sendMedia('/path/to/audio.mp3', threadID, 'audio');
\`\`\`

📄 **Files:**
\`\`\`javascript
// Send any file as attachment
const fs = require('fs');
const attachment = fs.createReadStream('/path/to/file.pdf');
api.sendMessage({ attachment }, threadID);
\`\`\`

💡 **Tips:**
- Use /media command for URL-based media
- Local files require full file paths
- Videos and audio work best as local files
- Images support both URL and local files
                    `;
                    
                    api.sendMessage(mediaExamples, threadID);
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: text, image, media', threadID);
            }
            
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
