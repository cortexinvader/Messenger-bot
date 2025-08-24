const axios = require('axios');
import fs from 'fs-extra' ;
const path = require('path');

module.exports = {
    name: 'cmd',
    description: 'Install or delete commands dynamically',
    permission: 'owner',
    usage: '/cmd <-i|-del> <url_or_filename> [inline_code]',
    examples: [
        '/cmd -i https://pastebin.com/raw/xyz123',
        '/cmd -i https://raw.githubusercontent.com/user/repo/main/command.js',
        '/cmd -i test.js module.exports = { name: "test", execute: async (api, msg) => api.sendMessage("Hello!", msg.threadID) }',
        '/cmd -del weather.js'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length < 2) {
            return api.sendMessage('❌ Usage: /cmd <-i|-del> <url_or_filename> [inline_code]\n\nExamples:\n• /cmd -i https://pastebin.com/raw/xyz123\n• /cmd -i test.js module.exports = {...}\n• /cmd -del commandname', threadID);
        }
        
        const action = args[0].toLowerCase();
        const target = args[1];
        
        try {
            switch (action) {
                case '-i':
                case 'install':
                    api.sendMessage('⏳ Installing command...', threadID);
                    
                    try {
                        let commandCode;
                        
                        // Check if it's a URL or inline code
                        if (target.startsWith('http')) {
                            // Download command file from URL
                            const response = await axios.get(target, { timeout: 30000 });
                            commandCode = response.data;
                        } else if (target.endsWith('.js') && args.length > 2) {
                            // Handle inline code: /cmd -i filename.js const code = "...";
                            const filename = target;
                            commandCode = args.slice(2).join(' ');
                            
                            // Basic validation for inline code
                            if (!commandCode.includes('module.exports') || commandCode.length < 50) {
                                return api.sendMessage('❌ Invalid inline code. Must include module.exports and proper command structure.', threadID);
                            }
                        } else {
                            return api.sendMessage('❌ Please provide either:\n• A valid URL (GitHub raw, Pastebin, etc.)\n• Inline code: /cmd -i filename.js module.exports = {...}', threadID);
                        }
                        
                        // Validate command structure
                        if (!commandCode.includes('module.exports') || 
                            !commandCode.includes('name:') || 
                            !commandCode.includes('execute')) {
                            throw new Error('Invalid command file structure');
                        }
                        
                        // Extract command name
                        const nameMatch = commandCode.match(/name:\s*['"`]([^'"`]+)['"`]/);
                        const commandName = nameMatch ? nameMatch[1] : path.basename(target, '.js');
                        
                        // Save command file
                        const commandsDir = path.join(__dirname);
                        const filePath = path.join(commandsDir, `${commandName}.js`);
                        await fs.writeFile(filePath, commandCode);
                        
                        // Load the command
                        delete require.cache[path.resolve(filePath)];
                        const command = require(filePath);
                        
                        // Add to bot's command map
                        bot.commands.set(command.name, command);
                        
                        // Save to database
                        const database = bot.getDatabase();
                        const { randomUUID } = require('crypto');
                        const descMatch = commandCode.match(/description:\s*['"`]([^'"`]+)['"`]/);
                        const permMatch = commandCode.match(/permission:\s*['"`]([^'"`]+)['"`]/);
                        
                        database.createCommand({
                            id: randomUUID(),
                            name: command.name,
                            description: descMatch?.[1] || 'Dynamically installed command',
                            permission: permMatch?.[1] || 'user',
                            status: 'active',
                            file_path: filePath,
                            source_url: target
                        });
                        
                        api.sendMessage(`✅ Command "/${command.name}" installed successfully!\n\n` +
                                      `Description: ${command.description || 'No description'}\n` +
                                      `Permission: ${command.permission || 'user'}\n` +
                                      `Source: ${target}`, threadID);
                        
                    } catch (error) {
                        console.error('Command installation error:', error.message);
                        api.sendMessage(`❌ Failed to install command: ${error.message}`, threadID);
                    }
                    break;
                    
                case '-del':
                case 'delete':
                    const commandName = target.replace('.js', '');
                    const command = bot.commands.get(commandName);
                    
                    if (!command) {
                        return api.sendMessage(`❌ Command "${commandName}" not found.`, threadID);
                    }
                    
                    // Prevent deletion of core commands
                    const coreCommands = ['help', 'cmd', 'system', 'shell'];
                    if (coreCommands.includes(commandName)) {
                        return api.sendMessage('❌ Cannot delete core system commands.', threadID);
                    }
                    
                    try {
                        // Remove from command map
                        bot.commands.delete(commandName);
                        
                        // Delete file
                        const filePath = path.join(__dirname, `${commandName}.js`);
                        if (await fs.pathExists(filePath)) {
                            await fs.remove(filePath);
                        }
                        
                        // Remove from database
                        const database = bot.getDatabase();
                        const dbCommand = database.getCommandByName(commandName);
                        if (dbCommand) {
                            database.deleteCommand(dbCommand.id);
                        }
                        
                        api.sendMessage(`✅ Command "/${commandName}" deleted successfully.`, threadID);
                        
                    } catch (error) {
                        console.error('Command deletion error:', error.message);
                        api.sendMessage(`❌ Failed to delete command: ${error.message}`, threadID);
                    }
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: -i (install), -del (delete)', threadID);
            }
            
        } catch (error) {
            console.error('Cmd command error:', error.message);
            api.sendMessage('❌ An error occurred while managing commands.', threadID);
        }
    }
};
