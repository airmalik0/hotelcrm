# Frontend Development Guidelines - Hotel CRM

## Stack
Framework: React 19 with TypeScript
Language: TypeScript (.tsx for components, .ts for utilities)
UI: Tailwind CSS (WowDash HTML templates as reference)
Routing: React Router v7
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
src/client/*.gen.ts      # Generated API client (DO NOT EDIT)
wowdash-templates-tailwand/  # HTML reference templates (83 files)
```

## Component Creation Rules

**⚠️ MANDATORY: Read `wowdash-templates-tailwand/wowdash.md` FIRST before creating ANY components!**

1. ALWAYS check WowDash HTML templates first for patterns:
   ```bash
   ls wowdash-templates-tailwand/pages/ | grep -i "keyword"
   ```
2. Extract Tailwind classes from HTML templates
3. Convert to React components with:
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
**IMPORTANT**: WowDash CSS classes (`.btn`, `.card`, `.form-control`) are NOT available in our React project. Always convert to pure Tailwind:

1. Find pattern in HTML: `<button class="btn btn-primary">Click me</button>`
2. Check SCSS file: `.btn { @apply rounded-lg py-3 px-6 inline-flex transition; }`
3. Check SCSS file: `.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }`
4. Convert to React: `<button className="rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700">Click me</button>`

**NEVER use WowDash CSS classes directly - always extract the underlying Tailwind utilities from @apply directives.**

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

### API Integration

**Flow:** `backend/models.py` → auto-generates → `src/client/` → use in components

1. **Usage in components:**
   ```typescript
   import { usersReadUsers, type UserPublic } from "@/client"
   import { useQuery } from "@tanstack/react-query"

   const { data, error, isLoading } = useQuery({
     queryKey: ["users"],
     queryFn: () => usersReadUsers({ limit: 100 }),
   })
   ```

2. **Alternative client usage:**
   ```typescript
   import { client } from "@/client"

   const { data, error, isLoading } = useQuery({
     queryKey: ["users"],
     queryFn: () => client.get('/api/v1/users/', { params: { limit: 100 } }),
   })
   ```

3. **Auto-generation:** When `models.py` changes, client regenerates via hook

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