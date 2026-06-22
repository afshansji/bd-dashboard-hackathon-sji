---
name: sj-code-standards
description: "SJ Innovation coding standards. Apply to ALL code changes, reviews, and new files in every SJ Innovation project."
---

# SJ Innovation Coding Standards

These standards apply to ALL code written, reviewed, or modified in any SJ Innovation project. No exceptions.

## TypeScript

- **Strict typing**: No `any` types. Use `unknown` if the type is truly unknown, then narrow it.
- **Explicit return types**: All exported functions and hooks must declare their return type.
- **Supabase generated types**: Use types from `@/integrations/supabase/types.ts` for database data. Don't duplicate schema as hand-written interfaces.
- **Interfaces for object shapes**: Use `interface` for component props and data structures. Use `type` for unions, intersections, and aliases.
- **Null safety**: Use optional chaining (`?.`) and nullish coalescing (`??`). Never assume data exists.

## React

- **Functional components only**: No class components.
- **Custom hooks for data**: ALL data fetching goes through custom hooks in `src/hooks/`. Never import Supabase client directly in components.
- **TanStack Query for server state**: Use `useQuery` for reads, `useMutation` for writes. No `useState` + `useEffect` for data fetching.
- **Components under 200 lines**: If a component exceeds 200 lines, decompose it. Extract sub-components, hooks, or utilities.
- **Three states**: Every data display must handle loading (skeleton/spinner), error (Alert/toast), and empty (EmptyState message).
- **Forms**: React Hook Form + Zod validation. Every form field needs a Zod schema.

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `CampaignDialog.tsx` |
| Hooks | camelCase with `use` prefix | `useBDCampaigns.tsx` |
| Utilities | camelCase | `axiosPrivate.ts` |
| Types/Interfaces | PascalCase | `interface CampaignProps {}` |
| Constants | SCREAMING_SNAKE_CASE | `DEAL_STAGES` |
| DB tables | snake_case | `campaign_contacts` |
| DB columns | snake_case | `created_at` |
| CSS classes | Tailwind (kebab via utility) | `cn("flex items-center gap-2")` |

## Error Handling

- **Try-catch on ALL async**: Every `await` must be in a try-catch block.
- **User errors → toast**: `toast({ title: "Error", description: error.message, variant: "destructive" })`
- **Debug errors → console.error**: Only `console.error` for internal debugging. Never `console.log` in production.
- **Supabase errors**: Always check: `const { data, error } = await supabase...; if (error) throw error;`
- **No silent failures**: Every catch block must handle the error (re-throw, log, or notify).

## Database

- **RLS on ALL tables**: Every new table must have Row Level Security enabled with appropriate policies.
- **UUID primary keys**: Use `gen_random_uuid()`, not `uuid_generate_v4()`.
- **Timestamps**: Include `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at` on every table.
- **Indexes**: Create indexes on all foreign key columns and frequently filtered columns.
- **Migrations**: One migration per feature. Name: `YYYYMMDDHHMMSS_description.sql`.

## Security

- **No hardcoded values**: API keys, URLs, tokens go in environment variables.
- **No service role in frontend**: Service role key stays in Edge Functions only.
- **Sanitize user content**: Use DOMPurify before rendering HTML with `dangerouslySetInnerHTML`.
- **Validate inputs**: Use Zod schemas on form submissions. Validate in Edge Functions too.

## Imports

- **Use `@/` alias**: All imports from `src/` use `@/` path alias.
- **Group imports**: React → external libs → internal modules → types → styles.
- **No circular imports**: Component A should not import from Component B if B imports from A.

## Git

- **Commit format**: `[TYPE] Description`
  - `feat:` - New feature
  - `fix:` - Bug fix
  - `refactor:` - Code restructuring
  - `docs:` - Documentation only
  - `style:` - Formatting, no logic change
  - `test:` - Tests only
  - `chore:` - Dependencies, config
- **Branch naming**: `claude/[description]-[sessionId]`
- **Never commit**: `.env`, `node_modules/`, `dist/`, credentials, large binaries

## Performance

- **Memoize expensive computations**: Use `useMemo` for derived data, `useCallback` for handler functions passed as props.
- **Lazy load non-critical pages**: Use `React.lazy()` for pages not needed on initial load.
- **Paginate large datasets**: Lists > 50 items should be paginated or virtualized.
- **Avoid re-render triggers**: Don't create new objects/arrays in JSX props.

## What NOT To Do

- Don't use `any`. Period.
- Don't fetch data in components. Use hooks.
- Don't skip error handling. Handle every error path.
- Don't leave `console.log` in code. Remove before committing.
- Don't use relative imports from `src/`. Use `@/`.
- Don't create tables without RLS. Always enable it.
- Don't hardcode values. Use env vars or constants.
- Don't make components > 200 lines. Decompose them.
- Don't submit forms without Zod validation.
- Don't skip loading/error/empty states on data displays.
