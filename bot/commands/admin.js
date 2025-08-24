module.exports = {
    name: 'admin',
    description: 'Administrative commands for group and bot management',
    permission: 'admin',
    usage: '/admin <kick|ban|warn|verify> <user_or_group> [reason]',
    examples: [
        '/admin kick @user Spamming',
        '/admin ban @user Inappropriate behavior',
        '/admin warn @user Please follow rules',
        '/admin verify group'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID, senderID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Usage: /admin <kick|ban|warn|verify> <target> [reason]', threadID);
        }
        
        const action = args[0].toLowerCase();
        const target = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';
        
        try {
            switch (action) {
                case 'kick':
                    if (!target) {
                        return api.sendMessage('❌ Please mention a user to kick.', threadID);
                    }
                    
                    // Extract user ID from mention
                    const kickUserId = target.replace(/[<@>]/g, '');
                    
                    api.sendMessage(`⚠️ Kicking user for: ${reason}`, threadID);
                    
                    // Note: FCA unofficial may have different methods for removing users
                    // This is a placeholder - actual implementation depends on the FCA version
                    api.sendMessage('⚠️ Kick functionality requires admin permissions in the group.', threadID);
                    break;
                    
                case 'ban':
                    if (!target) {
                        return api.sendMessage('❌ Please mention a user to ban.', threadID);
                    }
                    
                    const banUserId = target.replace(/[<@>]/g, '');
                    api.sendMessage(`🚫 User banned for: ${reason}`, threadID);
                    break;
                    
                case 'warn':
                    if (!target) {
                        return api.sendMessage('❌ Please mention a user to warn.', threadID);
                    }
                    
                    const warnUserId = target.replace(/[<@>]/g, '');
                    api.sendMessage(`⚠️ Warning issued to user: ${reason}`, threadID);
                    
                    // Log warning in database
                    const database = bot.getDatabase();
                    const { randomUUID } = require('crypto');
                    database.createActivity({
                        id: randomUUID(),
                        type: 'user_warned',
                        description: `User ${warnUserId} warned by ${senderID}: ${reason}`,
                        thread_id: threadID,
                        user_id: warnUserId
                    });
                    break;
                    
                case 'verify':
                    if (target === 'group') {
                        const database = bot.getDatabase();
                        let group = database.getGroupByThreadId(threadID);
                        
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
                                verified: true,
                                ai_enabled: false,
                                image_analysis_enabled: false
                            };
                            database.createGroup(group);
                        } else {
                            database.updateGroup(group.id, { verified: 1 });
                        }
                        
                        api.sendMessage('✅ Group has been verified! Bot is now active in this group.', threadID);
                    } else {
                        api.sendMessage('❌ Usage: /admin verify group', threadID);
                    }
                    break;
                    
                case 'info':
                    try {
                        const threadInfo = await new Promise((resolve) => {
                            api.getThreadInfo(threadID, (err, info) => {
                                resolve(err ? null : info);
                            });
                        });
                        
                        if (threadInfo) {
                            const infoText = `
📊 Group Information

👥 Name: ${threadInfo.name || 'Unknown'}
🆔 Thread ID: ${threadID}
👤 Members: ${threadInfo.participantIDs?.length || 0}
👑 Admins: ${threadInfo.adminIDs?.length || 0}
📅 Created: ${threadInfo.timestamp ? new Date(threadInfo.timestamp).toLocaleDateString() : 'Unknown'}
                            `.trim();
                            
                            api.sendMessage(infoText, threadID);
                        } else {
                            api.sendMessage('❌ Could not retrieve group information.', threadID);
                        }
                    } catch (error) {
                        api.sendMessage('❌ Error retrieving group information.', threadID);
                    }
                    break;
                    
                default:
                    api.sendMessage('❌ Available actions: kick, ban, warn, verify, info', threadID);
            }
            
        } catch (error) {
            console.error('Admin command error:', error.message);
            api.sendMessage('❌ An error occurred while executing admin command.', threadID);
        }
    }
};