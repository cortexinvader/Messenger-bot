
# Nexus FCA Bot Management System

A comprehensive Facebook Chat Bot management system built with modern web technologies. This system allows you to manage Facebook group interactions, install dynamic commands, configure AI responses through Google's Gemini AI, and monitor bot activities through an intuitive web interface.

## 🚀 Features

- **Web Dashboard**: React-based interface for bot configuration and monitoring
- **Facebook Bot Integration**: Powered by nexus-016 library for Messenger interactions
- **Dynamic Commands**: Install and manage commands from URLs in real-time
- **AI Integration**: Google Gemini AI for conversational responses
- **Group Management**: CRUD operations for Facebook groups with verification
- **Real-time Statistics**: Dashboard metrics and activity monitoring
- **Secure Authentication**: Facebook cookie/appstate management
- **Rate Limiting**: Built-in protection against spam and abuse

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **shadcn/ui** components with Tailwind CSS
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation

### Backend
- **Express.js** server with TypeScript
- **Drizzle ORM** with PostgreSQL
- RESTful APIs for bot management
- Session management and authentication

### Bot Integration
- **nexus-016** for Facebook Messenger API
- **Google Gemini AI** for conversational features
- Modular command system with permission levels
- Image analysis and shell access capabilities

## 📋 Prerequisites

- Node.js 20 or higher
- PostgreSQL database (automatically configured on Replit)
- Facebook account with cookies/appstate
- Google Gemini API key

## 🛠️ Setup Instructions

### 1. Environment Variables

Set up the following environment variables in Replit Secrets:

- `GEMINI_API_KEY`: Your Google Gemini AI API key
- `FACEBOOK_APPSTATE` (optional): Your Facebook cookies/appstate JSON
- `DATABASE_URL`: PostgreSQL connection string (auto-configured on Replit)

### 2. Facebook Authentication

#### Option 1: Through Web Interface
1. Navigate to the Authentication page in the web dashboard
2. Paste your Facebook cookies/appstate in the textarea
3. Click "Test Authentication" to verify
4. The system will automatically save valid cookies

#### Option 2: Manual File Setup
1. Copy your Facebook appstate JSON to `/bot/cookies/facebook.json`
2. Ensure the JSON format is valid

#### Getting Facebook Cookies/AppState
1. Log into Facebook in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage tab
4. Copy cookies or use browser extensions to extract appstate
5. Format as JSON array/object as required

### 3. Bot Configuration

Edit `/bot/config.json` to customize your bot:

```json
{
  "prefix": "/",
  "owners": ["YOUR_FACEBOOK_USER_ID"],
  "gemini": {
    "apiKey": "",
    "model": "gemini-2.5-flash",
    "temperature": 0.7,
    "enabled": true
  },
  "features": {
    "imageAnalysis": true,
    "shellAccess": true,
    "dynamicCommands": true
  }
}
```

### 4. Database Setup

The database is automatically configured on Replit. To manually set up:

```bash
npm run db:push
```

### 5. Running the Application

Click the **Run** button in Replit, or use:

```bash
npm run dev
```

The application will be available at your Replit URL.

## 🎯 Usage Guide

### Dashboard
- View bot statistics, active groups, and message counts
- Monitor system health and performance metrics
- Access quick actions for common tasks

### Group Management
- Add/remove Facebook groups
- Verify groups for bot access
- Configure group-specific settings
- Toggle features per group

### Command Management
- Install commands from GitHub URLs
- View all available commands
- Enable/disable commands dynamically
- Set permission levels (user, admin, owner)

### AI Configuration
- Configure Gemini AI settings
- Set temperature and model preferences
- Enable/disable AI responses
- Configure fallback options

### Authentication
- Test Facebook authentication status
- Update cookies/appstate
- View connection health
- Auto-save cookie preferences

## 🤖 Bot Commands

Default commands include:
- `/help` - Show available commands
- `/ai <message>` - Chat with Gemini AI
- `/weather <location>` - Get weather information
- `/uptime` - Check bot uptime
- `/shell <command>` - Execute shell commands (owners only)

## 🔧 Development

### Project Structure
```
├── bot/                 # Facebook bot core
│   ├── commands/        # Bot command modules
│   ├── cookies/         # Facebook authentication
│   └── config.json      # Bot configuration
├── client/              # React frontend
│   └── src/
├── server/              # Express backend
│   └── services/        # Business logic
├── shared/              # Shared types/schemas
└── package.json
```

### Adding Custom Commands

1. Create a new command file in `/bot/commands/`
2. Follow the command module format:
```javascript
module.exports = {
    name: "mycommand",
    description: "My custom command",
    usage: "/mycommand <args>",
    execute: async (api, message, args) => {
        // Command logic here
    }
};
```

3. The bot will automatically load new commands

### API Endpoints

- `GET /api/stats` - Bot statistics
- `GET /api/groups` - List Facebook groups
- `POST /api/groups` - Add new group
- `GET /api/commands` - List bot commands
- `POST /api/commands/install` - Install command from URL
- `POST /api/auth/test` - Test Facebook authentication

## 🚀 Deployment

The project is configured for Replit deployment:

1. Ensure all environment variables are set
2. Test the application locally
3. Use Replit's deployment features for production

Build command: `npm run build`
Start command: `npm run start`

## 🔒 Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Group Verification**: Restricts bot access to verified groups
- **Owner Controls**: Shell access requires owner approval
- **Secure Storage**: Cookies and API keys stored securely
- **Permission Levels**: Granular command access control

## 🛡️ Troubleshooting

### Common Issues

**Bot not responding:**
- Check Facebook authentication status
- Verify cookies/appstate validity
- Ensure group is verified (if required)

**API errors:**
- Verify Gemini API key is set correctly
- Check network connectivity
- Review server logs for detailed errors

**Database connection issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL environment variable
- Run `npm run db:push` to sync schema

### Logs and Debugging

Check the console output in Replit for detailed logs:
- Bot connection status
- API request/response logs
- Error messages and stack traces
- Command execution logs

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review console logs
- Create an issue in the repository
