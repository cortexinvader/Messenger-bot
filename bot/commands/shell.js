const { exec } = require('child_process');

module.exports = {
    name: 'shell',
    description: 'Execute shell commands (Admin only with owner approval)',
    permission: 'admin',
    usage: '/shell [command]',
    examples: [
        '/shell ls -la',
        '/shell ps aux',
        '/shell df -h'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID, senderID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Please specify a command. Usage: /shell [command]', threadID);
        }
        
        const command = args.join(' ');
        
        // Security check
        const blacklistedCommands = ['rm -rf', 'format', 'del', 'shutdown', 'reboot', 'passwd'];
        if (blacklistedCommands.some(blocked => command.toLowerCase().includes(blocked))) {
            return api.sendMessage('❌ This command is not allowed for security reasons.', threadID);
        }
        
        // Check if owner approval is required
        const userPermission = await bot.getUserPermission(senderID, threadID);
        if (userPermission !== 'owner' && bot.config.security?.ownerApprovalForShell) {
            return api.sendMessage('❌ Shell commands require owner approval. Please contact the bot owner.', threadID);
        }
        
        try {
            api.sendMessage('⏳ Executing command...', threadID);
            
            const result = await bot.executeShellCommand(command, senderID);
            
            const output = result.toString().trim();
            const responseText = output.length > 2000 
                ? `📋 Command executed successfully. Output too long, showing first 2000 characters:\n\n${output.substring(0, 2000)}...`
                : `📋 Command executed successfully:\n\n${output}`;
            
            api.sendMessage(responseText, threadID);
            
        } catch (error) {
            console.error('Shell command error:', error.message);
            api.sendMessage(`❌ Command failed: ${error.message}`, threadID);
        }
    }
};
