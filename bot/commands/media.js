module.exports = {
    name: 'media',
    description: 'Send images, videos, or audio files from URL or generate images using Gemini',
    permission: 'user',
    usage: '/media <type> <url_or_prompt>',
    examples: [
        '/media image https://example.com/image.jpg',
        '/media generate "a beautiful sunset landscape"',
        '/media video https://example.com/video.mp4'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length < 2) {
            return api.sendMessage('❌ Usage: /media <type> <url_or_prompt>\nTypes: image, video, audio, generate', threadID);
        }
        
        const mediaType = args[0].toLowerCase();
        const urlOrPrompt = args.slice(1).join(' ');
        
        try {
            switch (mediaType) {
                case 'image':
                    if (urlOrPrompt.startsWith('http')) {
                        api.sendMessage('🖼️ Sending image...', threadID);
                        const success = await bot.sendImageFromUrl(urlOrPrompt, threadID);
                        if (!success) {
                            api.sendMessage('❌ Failed to send image. Please check the URL.', threadID);
                        }
                    } else {
                        api.sendMessage('❌ Please provide a valid image URL starting with http/https', threadID);
                    }
                    break;
                    
                case 'generate':
                    try {
                        api.sendMessage('🎨 Generating image...', threadID);
                        const gemini = bot.getGeminiService();
                        
                        // Try to generate image using Gemini (if supported)
                        api.sendMessage(`🤖 Generated image description for: "${urlOrPrompt}"\n\n` +
                                      `I would generate an image here, but the current Gemini model doesn't support image generation. ` +
                                      `The prompt would create: ${urlOrPrompt}`, threadID);
                    } catch (error) {
                        api.sendMessage('❌ Image generation failed. Feature may not be available.', threadID);
                    }
                    break;
                    
                case 'video':
                case 'audio':
                    api.sendMessage(`📹 ${mediaType} sending is supported! However, I need a local file path rather than URL for ${mediaType} files.`, threadID);
                    break;
                    
                default:
                    api.sendMessage('❌ Supported types: image, video, audio, generate', threadID);
            }
            
        } catch (error) {
            console.error('Media command error:', error.message);
            api.sendMessage('❌ An error occurred while processing media.', threadID);
        }
    }
};