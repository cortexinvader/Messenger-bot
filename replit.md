# Overview

Sentinel Messenger Chatbot is a comprehensive Facebook Messenger bot management system built with modern web technologies. The system provides a React-based web dashboard for bot configuration and monitoring, along with a powerful Facebook bot integration using the nexus-016 library. Key features include dynamic command installation, AI integration with Google Gemini, group management with verification, real-time statistics, and secure authentication through Facebook cookies/appstate management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the web dashboard
- **Vite** for fast development builds and hot module replacement
- **shadcn/ui** component library with Tailwind CSS for consistent styling
- **TanStack Query** for efficient server state management and caching
- **React Hook Form** with Zod validation for form handling
- **Wouter** for client-side routing
- Component structure organized under `client/src/components` with reusable UI components

## Backend Architecture
- **Express.js** server with TypeScript for REST API endpoints
- **Drizzle ORM** as the primary database abstraction layer
- RESTful API design with endpoints for groups, commands, authentication, and statistics
- Middleware for request logging, error handling, and JSON parsing
- Service layer pattern with dedicated services for bot management, command handling, and AI integration
- SQLite fallback service for local data storage when PostgreSQL is unavailable

## Bot Integration
- **nexus-016 (Sentinel FCA)** library for Facebook Messenger API interactions
- Modular command system with permission levels (user, admin, owner)
- Dynamic command installation from URLs with validation
- AI conversation handling through Google Gemini integration
- Image analysis capabilities and shell access for advanced features
- Rate limiting and security controls to prevent abuse

## Data Storage
- **PostgreSQL** as the primary database with Drizzle ORM schema definitions
- **SQLite** as a fallback database service for development and offline scenarios
- Database schema includes tables for users, groups, commands, messages, bot configuration, and activities
- Cookie/appstate storage for Facebook authentication persistence

## Authentication & Security
- Facebook cookie/appstate based authentication for bot access
- Permission-based command system with three levels: user, admin, owner
- Security features including shell command blacklisting, owner approval requirements, and group verification
- Rate limiting with configurable thresholds and cooldown periods
- Secure cookie storage and automatic session management

## AI Integration
- **Google Gemini AI** for conversational responses with fallback model support
- Multiple model support (gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-flash)
- Automatic model switching when rate limits are reached
- Configurable temperature and response parameters
- Image analysis capabilities for multimedia content processing

# External Dependencies

## Core Dependencies
- **nexus-016**: Facebook Chat API library for Messenger bot functionality
- **@google/genai**: Google Gemini AI SDK for conversational AI features
- **drizzle-orm**: TypeScript ORM for database operations
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **better-sqlite3**: SQLite database driver for local fallback storage

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **react-hook-form**: Form handling with validation
- **zod**: Schema validation library

## Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

## External Services
- **Google Gemini API**: AI conversation and image analysis
- **Facebook Messenger API**: Bot communication through nexus-016
- **PostgreSQL Database**: Primary data storage (DATABASE_URL required)
- **Uptime Service**: Optional keep-alive functionality for hosting platforms