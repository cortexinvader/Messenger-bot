module.exports = {
    name: 'help',
    description: 'Display available commands and usage information',
    permission: 'user',
    usage: '/help [command]',
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length > 0) {
            // Show help for specific command
            const commandName = args[0].toLowerCase();
            const command = bot.commands.get(commandName);
            
            if (!command) {
                return api.sendMessage(`❌ Command "${commandName}" not found.`, threadID);
            }
            
            const helpText = `
📋 Command: /${command.name}
📝 Description: ${command.description}
🔐 Permission: ${command.permission}
💡 Usage: ${command.usage || `/${command.name}`}
${command.examples ? `\n📚 Examples:\n${command.examples.join('\n')}` : ''}
            `.trim();
            
            return api.sendMessage(helpText, threadID);
        }
        
        // Show all available commands
        const userPermission = await bot.getUserPermission(message.senderID, threadID);
        const availableCommands = [];
        
        for (const [name, command] of bot.commands) {
            if (bot.hasPermission(userPermission, command.permission)) {
                availableCommands.push(`/${name} - ${command.description}`);
            }
        }
        
        if (availableCommands.length === 0) {
            return api.sendMessage('❌ No commands available for your permission level.', threadID);
        }
        
        const helpText = `
🤖 Nexus FCA Bot - Available Commands

${availableCommands.join('\n')}

💡 Use /help [command] for detailed information about a specific command.
🔐 Your permission level: ${userPermission}
        `.trim();
        
        api.sendMessage(helpText, threadID);
    }
};
