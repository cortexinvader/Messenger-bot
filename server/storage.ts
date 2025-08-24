import { type User, type InsertUser, type Group, type InsertGroup, type Command, type InsertCommand, type Message, type InsertMessage, type BotConfig, type InsertBotConfig, type Activity, type InsertActivity } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Group methods
  getAllGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByThreadId(threadId: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;

  // Command methods
  getAllCommands(): Promise<Command[]>;
  getCommand(id: string): Promise<Command | undefined>;
  getCommandByName(name: string): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: string, updates: Partial<InsertCommand>): Promise<Command | undefined>;
  deleteCommand(id: string): Promise<boolean>;

  // Message methods
  getMessages(threadId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Bot config methods
  getBotConfig(key: string): Promise<BotConfig | undefined>;
  setBotConfig(config: InsertBotConfig): Promise<BotConfig>;

  // Activity methods
  getActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private groups: Map<string, Group>;
  private commands: Map<string, Command>;
  private messages: Map<string, Message[]>;
  private botConfigs: Map<string, BotConfig>;
  private activities: Activity[];

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.commands = new Map();
    this.messages = new Map();
    this.botConfigs = new Map();
    this.activities = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByThreadId(threadId: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find(
      (group) => group.threadId === threadId,
    );
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const group: Group = {
      ...insertGroup,
      id,
      createdAt: new Date(),
    };
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...updates };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  async getAllCommands(): Promise<Command[]> {
    return Array.from(this.commands.values());
  }

  async getCommand(id: string): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async getCommandByName(name: string): Promise<Command | undefined> {
    return Array.from(this.commands.values()).find(
      (command) => command.name === name,
    );
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = randomUUID();
    const command: Command = {
      ...insertCommand,
      id,
      createdAt: new Date(),
    };
    this.commands.set(id, command);
    return command;
  }

  async updateCommand(id: string, updates: Partial<InsertCommand>): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;
    
    const updatedCommand = { ...command, ...updates };
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }

  async deleteCommand(id: string): Promise<boolean> {
    return this.commands.delete(id);
  }

  async getMessages(threadId: string, limit = 50): Promise<Message[]> {
    const threadMessages = this.messages.get(threadId) || [];
    return threadMessages.slice(-limit);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    
    const threadMessages = this.messages.get(message.threadId) || [];
    threadMessages.push(message);
    this.messages.set(message.threadId, threadMessages);
    
    return message;
  }

  async getBotConfig(key: string): Promise<BotConfig | undefined> {
    return this.botConfigs.get(key);
  }

  async setBotConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const id = randomUUID();
    const config: BotConfig = {
      ...insertConfig,
      id,
      updatedAt: new Date(),
    };
    this.botConfigs.set(config.key, config);
    return config;
  }

  async getActivities(limit = 50): Promise<Activity[]> {
    return this.activities.slice(-limit).reverse();
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: new Date(),
    };
    this.activities.push(activity);
    return activity;
  }
}

export const storage = new MemStorage();
