# Frontend Development Guidelines - Hotel CRM

## Stack
Framework: React 18.3 with TypeScript
Language: TypeScript (.tsx for components, .ts for utilities)
UI: Tailwind CSS (WowDash HTML templates as reference)
Routing: React Router v6
State: TanStack Query v5
Package Manager: npm
Build: Vite v7
Linter: Biome

## Commands
```bash
npm run dev              # Start dev server
npm run build            # Build production
npm run lint             # Run biome
npm run format           # Format code
npm run generate-client  # Regenerate API client
```

## File Structure
```
src/pages/*.tsx          # Page components (to be created)
src/components/*.tsx     # Reusable components (to be created)
src/layouts/*.tsx        # Layout components (to be created)
src/api/*.ts             # Custom API wrapper functions
src/lib/axios.ts         # Configured axios instance with interceptors
src/client/types.gen.ts  # Auto-generated TypeScript types (DO NOT EDIT)
wowdash-templates-tailwand/  # HTML reference templates (83 files)
```

## Component Creation Rules

**⚠️ MANDATORY: Read `wowdash-templates-tailwand/wowdash.md` FIRST before creating ANY components!**

**🔴 CRITICAL: When you see custom classes in HTML like `.form-control`, `.card`, `.btn`, `.table`, `.alert` - ALWAYS check SCSS files FIRST to extract Tailwind utilities, but NEVER use these class names in React!**
   ```bash
   # Check SCSS definitions for custom classes:
   cat wowdash-templates-tailwand/assets/scss/components/_form.scss
   cat wowdash-templates-tailwand/assets/scss/components/_card.scss
   cat wowdash-templates-tailwand/assets/scss/components/_button.scss
   cat wowdash-templates-tailwand/assets/scss/components/_table.scss
   ```

1. ALWAYS check WowDash HTML templates first for patterns:
   ```bash
   ls wowdash-templates-tailwand/pages/ | grep -i "keyword"
   ```
2. **CHECK SCSS FILES** for any custom classes found in HTML (`.form-control`, `.card`, etc.)
3. Extract the @apply Tailwind utilities from SCSS and use ONLY those utilities (NOT the class names)
4. Convert to React components with:
   - React hooks instead of jQuery
   - lucide-react icons instead of iconify
   - recharts instead of ApexCharts
4. Component naming: PascalCase (e.g., Dashboard.tsx, UserProfile.tsx)
5. Styling: Tailwind classes only (NO custom CSS)
6. TypeScript: Add proper types for props, state, and events

## WowDash Template Reference

**IMPORTANT**: WowDash HTML templates are REFERENCE ONLY for understanding UI patterns and extracting Tailwind classes. DO NOT copy jQuery/Bootstrap JS patterns.

### Template Structure
- **HTML templates**: Use @@include syntax, serve as UI pattern reference
- **JS files**: Contains warning headers - use ONLY for understanding logic concepts, implement in React way
- **SCSS files**: Defines custom classes like `.btn`, `.btn-primary-600` with @apply Tailwind utilities
- **Assets**: Images, fonts, and other static resources for complete reference

### Usage Workflow
1. **Find pattern**: Search HTML templates for similar UI component
2. **Extract styles**: Copy Tailwind classes and understand custom SCSS class definitions
3. **Convert logic**: Transform any JS concepts into React hooks/state patterns
4. **Implement**: Create React component using extracted Tailwind classes

### SCSS to Tailwind Conversion Process
**IMPORTANT**: WowDash CSS classes (`.btn`, `.card`, `.form-control`, `.table`, `.alert`) are NOT available in our React project. Always convert to pure Tailwind:

#### ⚠️ CRITICAL: DO NOT USE WowDash class names in React components!

**Example 1 - Button:**
```html
<!-- WowDash HTML (DO NOT COPY AS-IS) -->
<button class="btn btn-primary">Click me</button>
```
```scss
/* SCSS definitions (for reference only) */
.btn { @apply rounded-lg py-3 px-6 inline-flex transition; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
```
```jsx
// ❌ WRONG - Never use WowDash classes
<button className="btn btn-primary">Click me</button>

// ✅ CORRECT - Use only Tailwind utilities
<button className="rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700">
  Click me
</button>
```

**Example 2 - Card:**
```jsx
// ❌ WRONG
<div className="card">
  <div className="card-header">Title</div>
  <div className="card-body">Content</div>
</div>

// ✅ CORRECT
<div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-600">
  <div className="border-b border-neutral-200 dark:border-neutral-600 px-4 md:px-6 py-3">Title</div>
  <div className="px-6 py-5">Content</div>
</div>
```

**Example 3 - Table:**
```jsx
// ❌ WRONG
<div className="table-responsive">
  <table className="table">...</table>
</div>

// ✅ CORRECT
<div className="overflow-x-auto">
  <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
    ...
  </table>
</div>
```

**Example 4 - Form Controls:**
```jsx
// ❌ WRONG
<select className="form-select form-select-sm">...</select>

// ✅ CORRECT
<select className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent ps-3 pe-5 py-1.5 text-sm w-full">
  ...
</select>
```

**Remember:** The SCSS files are ONLY for understanding what styles to apply. Never use the class names themselves!

Available HTML templates in `wowdash-templates-tailwand/pages/`:
- **Auth**: sign-in, sign-up, forgot-password
- **Dashboards**: index (main), index-2 through index-9 (variants)
- **Forms**: form, form-layout, form-validation
- **Tables**: table-basic, table-data
- **Charts**: column-chart, line-chart, pie-chart
- **AI Generators**: text-generator, image-generator, video-generator, voice-generator, code-generator
- **Business**: invoice-add, invoice-list, invoice-preview, kanban
- **E-commerce**: wallet, payment-gateway, currencies
- **UI Components**: button, card, alert, badge, carousel, dropdown, tabs, etc.

## Theme System

- Dark mode via Tailwind's `dark:` class prefix
- Toggle with `document.documentElement.classList.toggle('dark')`
- Persistence in localStorage
- All components must include dark mode variants

## Key Patterns

### API Integration Architecture

**Current Architecture:**
- **Types only**: `@hey-api/openapi-ts` generates only TypeScript types (no client functions)
- **Custom wrappers**: API calls implemented manually in `src/api/*.ts`
- **HTTP client**: Uses axios throughout the application
- **Centralized client**: Axios instance in `src/lib/axios.ts` with auth interceptors

**API URL Configuration (VITE_API_URL):**

**Development Mode:**
- **Local dev**: Empty/not set → Vite proxy handles `/api/*` requests → forwards to `http://localhost:8000`
- **Docker dev**: `VITE_API_URL=http://localhost:8000` (set in docker-compose.override.yml)
- **Vite proxy**: Configured in `vite.config.js` to proxy `/api` to backend

**Production Mode:**
- **Docker prod**: `VITE_API_URL=https://api.${DOMAIN}` (set during build in Dockerfile)
- **Build time**: Variable is embedded into the built JavaScript bundle
- **Runtime**: axios uses `import.meta.env.VITE_API_URL || ""` as baseURL

**Flow:** `backend/models.py` → auto-generates → `frontend/openapi.json` → `src/client/types.gen.ts` → use in API wrappers → use in components

1. **Usage in components with custom API wrappers:**
   ```typescript
   import { getUsers } from "@/api/users"
   import type { UserPublic } from "@/client/types.gen"
   import { useQuery } from "@tanstack/react-query"

   const { data, error, isLoading } = useQuery({
     queryKey: ["users"],
     queryFn: () => getUsers({ limit: 100 }),
   })
   ```

2. **Direct axios client usage:**
   ```typescript
   import { apiClient } from "@/lib/axios"
   import type { UserPublic } from "@/client/types.gen"

   const { data, error, isLoading } = useQuery({
     queryKey: ["users"],
     queryFn: () => apiClient.get<{ data: UserPublic[], count: number }>('/api/v1/users/', {
       params: { limit: 100 }
     }).then(res => res.data),
   })
   ```

3. **Auto-generation:** When `models.py` changes, TypeScript types regenerate via hook (generates only types, no client functions - we use custom axios wrappers)

### Authentication
- JWT token in localStorage
- Protected routes via React Router
- Axios interceptors for token injection

### Styling
- ALWAYS use Tailwind classes
- NEVER write custom CSS
- Include dark: variants for dark mode
- Use clsx for conditional classes

## Critical Rules

- NEVER edit *.gen.ts files (auto-generated)
- ALWAYS reference WowDash HTML templates for UI patterns
- ALWAYS use Tailwind classes for styling
- NEVER add custom CSS
- COMMIT after completing features

## Best Practices

- Use stable React 18.3 with TypeScript
- Use React Router v6 with createBrowserRouter pattern
- Configure axios interceptors on instance.defaults
- Handle OAuth2 with URLSearchParams directly
- Use RouterProvider for route configuration