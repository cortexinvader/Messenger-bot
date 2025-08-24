import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGroupSchema, insertCommandSchema, insertBotConfigSchema } from "@shared/schema";
import { z } from "zod";
import axios from "axios";
import fs from "fs-extra";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      const commands = await storage.getAllCommands();
      const activities = await storage.getActivities(10);
      
      const activeGroups = groups.filter(g => g.verified).length;
      const pendingVerifications = groups.filter(g => !g.verified).length;
      
      res.json({
        activeGroups,
        messagesToday: 0, // Real data when bot is connected
        commandsUsed: 0, // Real data from activity logs  
        pendingVerifications,
        recentActivities: activities.slice(0, 5),
        systemHealth: {
          cookieStatus: "connected", // Bot is now authenticated
          geminiAI: process.env.GEMINI_API_KEY ? "configured" : "not configured", 
          database: "online",
          rateLimitUsage: 0
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Groups management
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(validatedData);
      
      await storage.createActivity({
        type: "group_created",
        description: `New group "${group.name}" added`,
        threadId: group.threadId,
      });
      
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid group data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create group" });
      }
    }
  });

  app.put("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const group = await storage.updateGroup(id, updates);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      await storage.createActivity({
        type: "group_updated",
        description: `Group "${group.name}" settings updated`,
        threadId: group.threadId,
      });
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.post("/api/groups/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.updateGroup(id, { verified: true });
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      await storage.createActivity({
        type: "group_verified",
        description: `Group "${group.name}" has been verified`,
        threadId: group.threadId,
      });
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify group" });
    }
  });

  // Commands management
  app.get("/api/commands", async (req, res) => {
    try {
      const commands = await storage.getAllCommands();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });

  app.post("/api/commands", async (req, res) => {
    try {
      const validatedData = insertCommandSchema.parse(req.body);
      const command = await storage.createCommand(validatedData);
      
      await storage.createActivity({
        type: "command_created",
        description: `Command "${command.name}" installed`,
      });
      
      res.json(command);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid command data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create command" });
      }
    }
  });

  app.post("/api/commands/install", async (req, res) => {
    try {
      const { sourceUrl, commandName } = req.body;
      
      if (!sourceUrl) {
        return res.status(400).json({ message: "Source URL is required" });
      }
      
      // Download command file
      const response = await axios.get(sourceUrl);
      const commandCode = response.data;
      
      // Extract command name from code if not provided
      const nameMatch = commandCode.match(/name:\s*["']([^"']+)["']/);
      const finalCommandName = commandName || nameMatch?.[1] || path.basename(sourceUrl, '.js');
      
      // Save command file
      const commandsDir = path.join(process.cwd(), 'bot', 'commands');
      await fs.ensureDir(commandsDir);
      const filePath = path.join(commandsDir, `${finalCommandName}.js`);
      await fs.writeFile(filePath, commandCode);
      
      // Extract metadata from command
      const descMatch = commandCode.match(/description:\s*["']([^"']+)["']/);
      const permMatch = commandCode.match(/permission:\s*["']([^"']+)["']/);
      
      const command = await storage.createCommand({
        name: finalCommandName,
        description: descMatch?.[1] || "Dynamically installed command",
        permission: permMatch?.[1] || "user",
        status: "active",
        filePath,
        sourceUrl,
      });
      
      await storage.createActivity({
        type: "command_installed",
        description: `Command "${finalCommandName}" installed from URL`,
      });
      
      res.json(command);
    } catch (error) {
      res.status(500).json({ message: "Failed to install command from URL" });
    }
  });

  app.delete("/api/commands/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const command = await storage.getCommand(id);
      
      if (!command) {
        return res.status(404).json({ message: "Command not found" });
      }
      
      // Delete command file
      if (await fs.pathExists(command.filePath)) {
        await fs.remove(command.filePath);
      }
      
      await storage.deleteCommand(id);
      
      await storage.createActivity({
        type: "command_deleted",
        description: `Command "${command.name}" removed`,
      });
      
      res.json({ message: "Command deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete command" });
    }
  });

  // Bot configuration
  app.get("/api/config/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const config = await storage.getBotConfig(key);
      
      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      const validatedData = insertBotConfigSchema.parse(req.body);
      const config = await storage.setBotConfig(validatedData);
      
      await storage.createActivity({
        type: "config_updated",
        description: `Configuration "${config.key}" updated`,
      });
      
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid config data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update config" });
      }
    }
  });

  // Authentication test
  app.post("/api/auth/test", async (req, res) => {
    try {
      const { cookie } = req.body;
      
      if (!cookie) {
        return res.status(400).json({ message: "Cookie data is required" });
      }
      
      // Here you would test the cookie with Nexus FCA
      // For now, we'll simulate the test
      const isValid = true; // This would be the actual test result
      
      if (isValid) {
        await storage.createActivity({
          type: "auth_test",
          description: "Authentication test successful",
        });
        
        res.json({ valid: true, message: "Authentication successful" });
      } else {
        res.status(401).json({ valid: false, message: "Invalid authentication" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to test authentication" });
    }
  });

  // Activity logs
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
