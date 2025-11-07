# ProfeFlow - Technology Stack

## Core Technologies

### Frontend Framework
- **Next.js 14** - React framework with App Router
- **TypeScript 5.5.4** - Type-safe JavaScript development
- **React 18.3.1** - UI library with hooks and server components

### Styling & UI
- **Tailwind CSS 3.4.9** - Utility-first CSS framework
- **Lucide React 0.427.0** - Icon library
- **Tailwind Merge 2.5.2** - Class name merging utility

### Backend & Database
- **Supabase** - PostgreSQL database with real-time features
- **Supabase SSR 0.5.1** - Server-side rendering support
- **Edge Functions** - Serverless functions for AI processing

### AI & Processing
- **OpenAI 4.56.0** - GPT-4 integration for content generation
- **Python Scripts** - Document processing and monitoring

### Form Management
- **React Hook Form 7.52.2** - Form state management
- **Zod 3.23.8** - Schema validation
- **Hookform Resolvers 3.9.0** - Form validation integration

### Feature Management
- **Hypertune 2.10.0** - Feature flag management
- **Vercel Edge Config 1.4.3** - Edge configuration

### PDF & Export
- **jsPDF 2.5.2** - PDF generation
- **html2canvas 1.4.1** - HTML to canvas conversion

### Analytics & Charts
- **Recharts 3.3.0** - Data visualization library

### Email & Communication
- **Resend 4.0.0** - Email service integration

## Development Tools

### Build & Development
- **ESLint 8.57.0** - Code linting
- **PostCSS 8.4.41** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixes

### Package Management
- **npm** - Primary package manager
- **tsx 4.20.6** - TypeScript execution for scripts

## Development Commands

### Core Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Administrative
```bash
npm run admin:create     # Create admin user
npm run admin:create-sql # Generate admin SQL
npm run admin:setup      # Admin setup instructions
```

### Feature Management
```bash
npm run flags:test       # Test feature flags
```

### Database
```bash
npm run seed:rubricas    # Seed rubric data
```

## Environment Configuration

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin operations
- `OPENAI_API_KEY` - OpenAI API access

### Optional Variables
- `RESEND_API_KEY` - Email service integration
- `NEXT_PUBLIC_SITE_URL` - Production site URL

## Deployment Configuration

### Next.js Configuration
- Image optimization for Supabase domains
- Environment variable exposure
- Remote pattern configuration for images

### Vercel Integration
- Automatic deployments from Git
- Edge function support
- Environment variable management