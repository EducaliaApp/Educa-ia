# ProfeFlow - Project Structure

## Directory Organization

### Core Application (`/app`)
- **(auth)/** - Authentication routes group (login, register, password recovery)
- **(dashboard)/** - Protected dashboard routes for authenticated users
- **admin/** - Administrative panel with analytics, user management, and system monitoring
- **api/** - Next.js API routes for backend functionality
- **upgrade/** - Subscription and payment management pages

### Components (`/components`)
- **ui/** - Reusable UI components (Button, Card, Form, Input, etc.)
- **admin/** - Administrative dashboard specific components
- **portafolio/** - Portfolio analysis and evaluation components
- **icons/** - Custom icon components
- **notificaciones/** - Notification system components
- **skeletons/** - Loading state components

### Backend Services (`/supabase`)
- **functions/** - Edge functions for AI analysis, document processing, and automation
- **migrations/** - Database schema migrations and updates
- **cronjobs/** - Scheduled tasks for document monitoring

### Data Layer (`/lib`)
- **supabase/** - Database client configuration and utilities
- **auth/** - Authentication helpers and storage
- **flags/** - Feature flag type definitions

### Scripts & Automation (`/scripts`)
- **pipeline-document-monitor/** - Python scripts for document processing and monitoring
- **cron/** - Cron job configurations
- Administrative utilities for user management and database seeding

### Database Schema (`/sql`)
- **schema/** - Core database schema definitions
- **admin/** - Administrative user setup and permissions
- **fixes/** - Database fixes and patches

### Documentation (`/docs`)
- **evaluacion_docente_2025/** - Teacher evaluation documentation and rubrics
- Setup guides and feature documentation

## Architectural Patterns

### Next.js App Router Structure
- Route groups for logical organization ((auth), (dashboard))
- Server actions for form handling and data mutations
- API routes for external integrations and complex operations

### Supabase Integration
- Row Level Security (RLS) for data access control
- Edge functions for AI processing and document analysis
- Real-time subscriptions for live updates

### Component Architecture
- Atomic design principles with ui/ base components
- Feature-specific component groupings (admin/, portafolio/)
- Skeleton components for loading states

### Data Flow
- Server-side data fetching with Supabase client
- Client-side state management with React hooks
- Form validation with react-hook-form and Zod schemas

## Key Relationships

### Authentication Flow
- Supabase Auth → Profile creation → Dashboard access
- Role-based access control for admin features

### AI Processing Pipeline
- User input → Supabase Edge Functions → OpenAI API → Structured response
- Document upload → Processing → Analysis → Feedback generation

### Subscription Management
- User profiles → Plan tracking → Feature access control
- Usage monitoring → Credit system → Upgrade prompts