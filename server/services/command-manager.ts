import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { randomUUID } from 'crypto';

export class CommandManager {
    private commandsDir: string;

    constructor(commandsDir: string = './bot/commands') {
        this.commandsDir = commandsDir;
        this.ensureCommandsDir();
    }

    private async ensureCommandsDir() {
        await fs.ensureDir(this.commandsDir);
    }

    async installCommand(sourceUrl: string, commandName?: string) {
        try {
            // Download command file
            const response = await axios.get(sourceUrl, { timeout: 30000 });
            const commandCode = response.data;

            // Validate that it's a valid JavaScript file
            if (!this.isValidCommandCode(commandCode)) {
                throw new Error('Invalid command file format');
            }

            // Extract command metadata
            const metadata = this.extractCommandMetadata(commandCode);
            const finalCommandName = commandName || metadata.name || path.basename(sourceUrl, '.js');

            // Save command file
            const filePath = path.join(this.commandsDir, `${finalCommandName}.js`);
            await fs.writeFile(filePath, commandCode);

            return {
                id: randomUUID(),
                name: finalCommandName,
                description: metadata.description || "Dynamically installed command",
                permission: metadata.permission || "user",
                status: "active",
                filePath,
                sourceUrl,
            };
        } catch (error) {
            throw new Error(`Failed to install command: ${error.message}`);
        }
    }

    async deleteCommand(filePath: string) {
        try {
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                return true;
            }
            return false;
        } catch (error) {
            throw new Error(`Failed to delete command file: ${error.message}`);
        }
    }

    private isValidCommandCode(code: string): boolean {
        try {
            // Basic validation for command structure
            return (
                code.includes('module.exports') &&
                code.includes('name:') &&
                code.includes('execute')
            );
        } catch {
            return false;
        }
    }

    private extractCommandMetadata(code: string) {
        const metadata: any = {};

        try {
            // Extract name
            const nameMatch = code.match(/name:\s*['"`]([^'"`]+)['"`]/);
            if (nameMatch) metadata.name = nameMatch[1];

            // Extract description
            const descMatch = code.match(/description:\s*['"`]([^'"`]+)['"`]/);
            if (descMatch) metadata.description = descMatch[1];

            // Extract permission
            const permMatch = code.match(/permission:\s*['"`]([^'"`]+)['"`]/);
            if (permMatch) metadata.permission = permMatch[1];

            // Extract usage
            const usageMatch = code.match(/usage:\s*['"`]([^'"`]+)['"`]/);
            if (usageMatch) metadata.usage = usageMatch[1];
        } catch (error) {
            console.warn('Failed to extract command metadata:', error.message);
        }

        return metadata;
    }

    async validateCommand(filePath: string): Promise<boolean> {
        try {
            const code = await fs.readFile(filePath, 'utf-8');
            return this.isValidCommandCode(code);
        } catch {
            return false;
        }
    }

    async loadCommand(filePath: string) {
        try {
            // Clear require cache
            delete require.cache[path.resolve(filePath)];
            return require(path.resolve(filePath));
        } catch (error) {
            throw new Error(`Failed to load command: ${error.message}`);
        }
    }

    async reloadAllCommands(): Promise<Map<string, any>> {
        const commands = new Map();
        
        try {
            const files = await fs.readdir(this.commandsDir);
            
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const filePath = path.join(this.commandsDir, file);
                    try {
                        const command = await this.loadCommand(filePath);
                        commands.set(command.name, command);
                    } catch (error) {
                        console.error(`Failed to load command ${file}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to reload commands:', error.message);
        }

        return commands;
    }

    generateHelpText(commands: Map<string, any>, userPermission: string = 'user'): string {
        const availableCommands: string[] = [];
        const permissions = ['user', 'admin', 'owner'];
        const userLevel = permissions.indexOf(userPermission);

        for (const [name, command] of commands) {
            const requiredLevel = permissions.indexOf(command.permission || 'user');
            if (userLevel >= requiredLevel) {
                availableCommands.push(`/${name} - ${command.description || 'No description'}`);
            }
        }

        if (availableCommands.length === 0) {
            return 'No commands available for your permission level.';
        }

        return `🤖 Available Commands:\n\n${availableCommands.join('\n')}\n\n💡 Use /help [command] for detailed information.`;
    }
}
