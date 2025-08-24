# Nexus FCA Bot Management System

## Overview

This project is a comprehensive Facebook Chat Bot management system built with modern web technologies. It consists of three main components: a React-based web dashboard for bot configuration and monitoring, a Node.js Express backend API, and a Facebook Messenger bot powered by the nexus-016 library. The system allows users to manage Facebook group interactions, install dynamic commands, configure AI responses through Google's Gemini AI, and monitor bot activities through an intuitive web interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using **React with TypeScript** and **Vite** as the build tool. It follows a component-based architecture with:

- **UI Framework**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation through Hookform Resolvers

The application uses a dashboard layout with a sidebar navigation containing five main sections: Dashboard, Authentication, Group Management, Commands, and AI Configuration. The UI is responsive and includes both light and dark theme support.

### Backend Architecture
The backend is an **Express.js** server with TypeScript that provides RESTful APIs for:

- **Bot Statistics and Monitoring**: Dashboard metrics, activity logs, and system health
- **Group Management**: CRUD operations for Facebook groups, verification status, and feature toggles
- **Command Management**: Dynamic command installation from URLs, command lifecycle management
- **AI Configuration**: Gemini AI settings and fallback configurations
- **Authentication Management**: Facebook cookie/appstate validation and storage

The server uses middleware for request logging and error handling, with development-specific features like Vite integration for hot module replacement.

### Database Layer
The system uses **Drizzle ORM** with **PostgreSQL** as the primary database. The schema includes:

- **Users**: Authentication and user management
- **Groups**: Facebook group information and settings
- **Commands**: Dynamic command definitions and metadata
- **Messages**: Chat message history and analytics
- **Bot Configuration**: Key-value configuration storage
- **Activities**: System activity logging

An in-memory storage implementation is also provided for development and testing purposes.

### Facebook Bot Integration
The bot component uses **nexus-016** library for Facebook Messenger integration with:

- **Command System**: Modular command architecture with permission levels (user, admin, owner)
- **AI Integration**: Google Gemini AI for conversational responses with fallback options
- **Security Features**: Rate limiting, command blacklisting, and owner approval workflows
- **Dynamic Features**: Runtime command installation, image analysis, and shell access (with restrictions)

### Development and Build System
- **Build Tool**: Vite for fast development and optimized production builds
- **Package Management**: npm with lockfile for dependency consistency
- **TypeScript Configuration**: Strict type checking with path aliases for clean imports
- **Development Server**: Hot module replacement with proxy support for API routes
- **Production Build**: Static asset generation with Express server bundling via esbuild

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with hooks and concurrent features
- **Express.js**: Node.js web server framework
- **TypeScript**: Type safety across the entire application
- **Vite**: Fast build tool and development server

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **@neondatabase/serverless**: Serverless PostgreSQL connection adapter
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI and Design System
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library
- **class-variance-authority**: Utility for creating variant-based component APIs

### State Management and Data Fetching
- **TanStack React Query**: Server state management with caching and synchronization
- **React Hook Form**: Forms with minimal re-renders and easy validation
- **Zod**: TypeScript-first schema validation

### Facebook Bot Integration
- **nexus-016**: Facebook Chat API library for bot functionality
- **@google/genai**: Google Gemini AI integration for conversational features
- **sharp**: Image processing for media analysis features

### Development Tools
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development environment integration
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **axios**: HTTP client for external API calls
- **clsx**: Utility for constructing className strings
- **nanoid**: Compact URL-safe unique ID generator