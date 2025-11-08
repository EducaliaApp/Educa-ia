# ProfeFlow - Development Guidelines

## Code Quality Standards

### TypeScript Usage
- **Strict typing**: All functions use explicit parameter and return types
- **Interface definitions**: Complex data structures defined with comprehensive interfaces
- **Enum usage**: Constants grouped in enums (NivelEducativo, NivelDesempeño, CategoriaLogro)
- **Optional properties**: Use `?` for optional fields and `undefined` checks

### Error Handling Patterns
- **Try-catch blocks**: Wrap all async operations and external API calls
- **Graceful degradation**: Return meaningful error responses with status codes
- **Error logging**: Console.error for debugging with context information
- **User feedback**: Provide user-friendly error messages in UI components

### Function Structure
- **Single responsibility**: Functions focus on one specific task
- **Async/await**: Consistent use over promises for better readability
- **Early returns**: Use guard clauses to reduce nesting
- **Parameter validation**: Check required parameters at function start

## Architectural Patterns

### Supabase Integration
- **Client initialization**: Create clients with proper authentication headers
- **RLS policies**: Use Row Level Security for data access control
- **Edge functions**: Serverless functions for AI processing and complex operations
- **Real-time subscriptions**: For live data updates

### AI Processing Pipeline
```typescript
// Standard AI function structure
const response = await openai.chat.completions.create({
  model: modelo,
  messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  temperature: 0.3,
  max_tokens: 6000
})
```

### Component Architecture
- **Client components**: Use 'use client' directive for interactive components
- **Props interfaces**: Define TypeScript interfaces for all component props
- **State management**: useState for local state, useEffect for side effects
- **Loading states**: Implement loading indicators for async operations

## Naming Conventions

### Files and Directories
- **kebab-case**: For directory names (pipeline-document-monitor, memory-bank)
- **PascalCase**: For React components (ExportPDFButton.tsx)
- **camelCase**: For utility files and functions (00-monitor.py, utils.ts)
- **Descriptive names**: Clear purpose indication (analizar-planificacion, rubricas-engine)

### Variables and Functions
- **camelCase**: Standard JavaScript/TypeScript convention
- **Descriptive names**: `construirPromptVerificacion`, `extraerContenidoRelevante`
- **Boolean prefixes**: `isPro`, `cumple_nivel`, `procesado`
- **Constants**: UPPER_SNAKE_CASE for system prompts and configuration

### Database Schema
- **snake_case**: For table and column names (documentos_oficiales, año_vigencia)
- **Prefixed tables**: Related tables share prefixes (analisis_ia_, rubricas_)
- **Foreign keys**: Clear relationship naming (profesor_id, tarea_id)

## API Design Patterns

### Request/Response Structure
```typescript
// Standard API response format
return new Response(
  JSON.stringify({
    success: true,
    data: result,
    metadata: { tokens_usados, latencia_ms, costo_usd }
  }),
  { headers: { 'Content-Type': 'application/json' }, status: 200 }
)
```

### Authentication Flow
- **Header validation**: Check Authorization header in all protected endpoints
- **User extraction**: `supabase.auth.getUser()` for user context
- **Error responses**: 401 for unauthorized, 404 for not found

### Data Validation
- **Input sanitization**: Validate all user inputs before processing
- **Type checking**: Ensure data matches expected interfaces
- **Business logic validation**: Check user permissions and limits

## UI/UX Patterns

### Component Props
```typescript
interface ComponentProps {
  required_prop: string
  optional_prop?: boolean
  callback_prop: (data: any) => void
}
```

### Loading States
- **Button loading**: Disable buttons and show loading indicator during async operations
- **Skeleton components**: Use skeleton loaders for better perceived performance
- **Progress indicators**: Show progress for multi-step operations

### Error Handling in UI
- **Toast notifications**: For success/error feedback
- **Inline validation**: Real-time form validation
- **Fallback UI**: Graceful degradation when data is unavailable

## Performance Optimization

### Database Queries
- **Select specific fields**: Avoid `SELECT *`, specify needed columns
- **Proper indexing**: Use indexes for frequently queried fields
- **Pagination**: Implement pagination for large datasets
- **Caching**: Cache frequently accessed data

### AI API Usage
- **Token optimization**: Minimize prompt tokens while maintaining quality
- **Model selection**: Choose appropriate model for task complexity
- **Cost tracking**: Monitor and log API usage costs
- **Rate limiting**: Implement proper rate limiting for API calls

### Frontend Performance
- **Code splitting**: Use dynamic imports for large components
- **Image optimization**: Optimize images and use Next.js Image component
- **Bundle analysis**: Monitor bundle size and optimize dependencies

## Security Best Practices

### Data Protection
- **Environment variables**: Store sensitive data in environment variables
- **Input validation**: Sanitize all user inputs
- **SQL injection prevention**: Use parameterized queries
- **XSS protection**: Escape user-generated content

### Authentication & Authorization
- **JWT validation**: Verify tokens on server-side
- **Role-based access**: Implement proper role checking
- **Session management**: Secure session handling
- **Password security**: Use strong password requirements

### API Security
- **CORS configuration**: Proper CORS setup for API endpoints
- **Rate limiting**: Prevent abuse with rate limiting
- **Request validation**: Validate all incoming requests
- **Error information**: Don't expose sensitive information in errors

## Testing Patterns

### Unit Testing
- **Pure functions**: Test business logic functions in isolation
- **Mock external dependencies**: Mock API calls and database operations
- **Edge cases**: Test boundary conditions and error scenarios
- **Assertion clarity**: Use descriptive test names and assertions

### Integration Testing
- **API endpoints**: Test complete request/response cycles
- **Database operations**: Test data persistence and retrieval
- **Authentication flows**: Test login/logout and protected routes
- **Error scenarios**: Test error handling and recovery

## Documentation Standards

### Code Comments
- **Function documentation**: Document complex functions with JSDoc
- **Business logic**: Explain non-obvious business rules
- **TODO comments**: Mark areas for future improvement
- **API documentation**: Document API endpoints and parameters

### README Files
- **Setup instructions**: Clear installation and configuration steps
- **Usage examples**: Provide code examples for common use cases
- **Environment setup**: Document required environment variables
- **Troubleshooting**: Common issues and solutions