# Vision Module Documentation

## Overview

The Vision page provides a high-level visual overview of the BD AI Portal's purpose, features, and AI agents. It serves as an internal landing page for SJ Innovation team members to understand the platform's capabilities and strategic direction.

## Location

- **Route**: `/vision`
- **Navigation**: Sidebar, after "Feedback" tab
- **Access**: All authenticated users (team_member and above)

---

## Page Structure

### 1. Vision Hero (`VisionHero.tsx`)

A prominent banner section with:
- Gradient background (primary → accent)
- Project title and tagline
- Strategic North Star callout box

**Key content:**
- Title: "BD AI Portal"
- Tagline: "Orchestrating intelligent business development at startup velocity"
- North Star: 30% pipeline growth, 20% faster deals, audit-ready transparency

### 2. Vision Pillars (`VisionPillars.tsx`)

Three core principles displayed as cards:

| Pillar | Icon | Description |
|--------|------|-------------|
| Always-On Intelligence | Brain | Agents anticipate opportunities without human prompts |
| Composable Workflows | Workflow | Business teams orchestrate BD sequences without code |
| Human-in-the-Loop | UserCheck | Clear approval checkpoints for compliance |

### 3. Feature Showcase (`FeatureShowcase.tsx`)

Grid of platform modules with links:

| Module | Route | Color Theme |
|--------|-------|-------------|
| Pipeline Management | /prospecting | Emerald/Teal |
| Outreach & Campaigns | /campaigns | Violet/Purple |
| Performance Tracking | /bd/performance/personal | Blue/Cyan |
| Document Signing | /signing-documents | Orange/Amber |
| Feedback System | /feedback | Pink/Rose |
| Task Management | /bd/actions/tasks | Indigo/Blue |

### 4. Agent Gallery (`AgentGallery.tsx`)

Dynamic grid of active AI agents:
- Fetches from `ai_agents` table via `useAgentList` hook
- Filters to show only active agents (`is_active = true`)
- Displays agent name, category badge, and mission description
- **Clickable cards** that open `AgentDetailModal` with full agent information
- **Tracks views** in `agent_views` table for analytics

**Agent detail modal shows:**
- Agent name, category, and status
- Full description
- "Where to Find It" with navigation button (if user has access)
- "Who Can Use It" with role requirements
- "Why Use This Agent" with benefits and use cases
- "Usage Analytics" (visible to managers+)

### 5. Agent Examples (`AgentExamples.tsx`)

Interactive demonstration section:
- Dropdown to select an agent
- "Run Example" button to simulate agent output
- Before/After comparison cards showing:
  - Manual process time and effort
  - Agent output with time savings

**Hardcoded examples for:**
- BD Research Analyst
- LinkedIn Message Generator
- Deal Status Intelligence

### 6. Impact Metrics (`ImpactMetrics.tsx`)

Three target metrics displayed as large stat cards:

| Metric | Value | Description |
|--------|-------|-------------|
| Pipeline Velocity | 30% | Increase via intelligent lead scoring |
| Deal Acceleration | 20% | Faster cycles via automated follow-ups |
| Trust & Compliance | 100% | Audit-ready transparency |

---

## Data Sources

| Component | Data Source |
|-----------|-------------|
| VisionHero | Static content |
| VisionPillars | Static content |
| FeatureShowcase | Static content with route links |
| AgentGallery | Database: `ai_agents` table with detail modal |
| AgentDetailModal | Database: `ai_agents` + `agent_views` tables |
| AgentExamples | Hardcoded example data |
| ImpactMetrics | Static content |

---

## Database Schema for Agents

### `ai_agents` table columns for Vision page:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `name` | TEXT | Agent display name |
| `description` | TEXT | Short description |
| `category` | TEXT | Agent category (e.g., "business_development") |
| `is_active` | BOOLEAN | Whether agent is active |
| `usage_location` | TEXT | Where in the app this agent is found |
| `usage_route` | TEXT | Route path to navigate to the feature |
| `min_role_required` | app_role | Minimum role needed to use this agent |
| `benefits` | JSONB | Array of benefit statements |
| `use_cases` | JSONB | Array of specific use case scenarios |

### `agent_views` table:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | Foreign key to ai_agents |
| `user_id` | UUID | Who viewed the detail |
| `viewed_at` | TIMESTAMPTZ | When they clicked |

---

## File Structure

```
src/
├── pages/
│   └── Vision.tsx                  # Main page component
├── components/
│   └── vision/
│       ├── VisionHero.tsx          # Hero banner
│       ├── VisionPillars.tsx       # Three pillars section
│       ├── FeatureShowcase.tsx     # Feature modules grid
│       ├── AgentGallery.tsx        # Active agents display (clickable)
│       ├── AgentDetailModal.tsx    # Agent detail drawer
│       ├── AgentExamples.tsx       # Interactive demo
│       └── ImpactMetrics.tsx       # Target metrics
├── Api/
│   └── aiAgents.ts                 # Agent API functions
```

---

## Design Patterns

### Colors
- Uses semantic design tokens from `index.css`
- Gradient classes: `bg-gradient-to-br from-primary to-accent`
- Card hover effects with `hover:shadow-lg hover:-translate-y-1`

### Typography
- Section headers: `text-2xl font-bold text-foreground`
- Body text: `text-muted-foreground`
- Descriptions: `text-sm text-muted-foreground`

### Layout
- Page container: `py-8 space-y-16` for section spacing
- Cards: Use shadcn `Card` component
- Grids: `grid md:grid-cols-3 gap-6`

### Animations
- Card hover: `transition-all duration-300`
- Icon hover: `group-hover:scale-110 transition-transform`
- Content reveal: CSS transition with timeout

---

## Accessibility

- All icons have semantic meaning via text labels
- Color contrast meets WCAG AA standards
- Interactive elements are keyboard accessible
- Cards have visible focus states

---

## Future Enhancements

1. **Live Agent Stats**: Show real-time run counts and success rates
2. **Roadmap Timeline**: Add project phases with progress indicators
3. **Team Contributors**: Showcase team members behind each feature
4. **Video Demos**: Embed short videos showing agents in action
5. **Personalized View**: Show agents relevant to user's role

---

---

# AI Prompt: Build a Vision Page for Your Project

Use the following prompt to instruct an AI to build a similar Vision page in any new project. Copy and customize the variables in `[brackets]` for your specific project.

---

## Prompt Template

```
Build a "Vision" page for [PROJECT_NAME] that serves as an internal landing page showcasing the platform's purpose, features, and AI agents. Follow this exact structure and make all data dynamic where applicable.

## Project Context
- Project Name: [PROJECT_NAME]
- Project Tagline: [PROJECT_TAGLINE]
- North Star Goals: [GOAL_1], [GOAL_2], [GOAL_3]

## Page Structure (6 sections)

### 1. Vision Hero
Create `src/components/vision/VisionHero.tsx`:
- Gradient background using semantic tokens (bg-gradient-to-br from-primary to-accent)
- Large title: [PROJECT_NAME]
- Tagline: [PROJECT_TAGLINE]
- "North Star" callout box with 3 strategic goals
- Use Sparkles icon from lucide-react

### 2. Vision Pillars
Create `src/components/vision/VisionPillars.tsx`:
- 3 core principle cards in a responsive grid
- Each card has: icon, title, description
- Default pillars (customize as needed):
  1. Always-On Intelligence (Brain icon) - "Agents anticipate opportunities without human prompts"
  2. Composable Workflows (Workflow icon) - "Business teams orchestrate sequences without code"
  3. Human-in-the-Loop (UserCheck icon) - "Clear approval checkpoints for compliance"
- Hover effect: shadow-lg, -translate-y-1 transition

### 3. Feature Showcase
Create `src/components/vision/FeatureShowcase.tsx`:
- Grid of platform modules (3 columns on desktop)
- Each card links to a route with a "Go to [Module]" button
- Cards include: icon, title, description, navigation button
- Use Link from react-router-dom
- Customize modules for your project:
  [
    { title: "[MODULE_1]", route: "[ROUTE_1]", description: "[DESC_1]" },
    { title: "[MODULE_2]", route: "[ROUTE_2]", description: "[DESC_2]" },
    ...
  ]

### 4. Agent Gallery (DYNAMIC)
Create `src/components/vision/AgentGallery.tsx`:
- Fetch agents from database table `ai_agents` where is_active = true
- Display in responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card shows: agent name, category badge, description
- **IMPORTANT: Cards must be clickable** - open AgentDetailModal on click
- Track views in `agent_views` table when modal opens

Create `src/components/vision/AgentDetailModal.tsx`:
- Sheet/Drawer from right side
- Sections:
  a. Header: Agent name, category badge, status indicator
  b. Description: Full agent description
  c. "Where to Find It": usage_location text + "Go There" button (if user has role access)
  d. "Who Can Use It": min_role_required + checkmark/lock based on current user's role
  e. "Why Use This Agent": benefits array as bullet list, use_cases as examples
  f. "Usage Analytics" (managers+ only): view count, last viewed date from agent_views table

Database requirements for ai_agents table (add columns if needed):
- usage_location (TEXT): Where in app the agent is found
- usage_route (TEXT): Route path for navigation
- min_role_required (app_role/TEXT): Minimum role to access
- benefits (JSONB): Array of benefit strings
- use_cases (JSONB): Array of use case strings

Database requirements for agent_views table (create if needed):
- id (UUID, PK)
- agent_id (UUID, FK to ai_agents)
- user_id (UUID)
- viewed_at (TIMESTAMPTZ, default now())
- RLS: Users can insert their own views, managers+ can read all

### 5. Agent Examples
Create `src/components/vision/AgentExamples.tsx`:
- Dropdown to select an agent
- "Run Example" button with loading state
- Before/After comparison:
  - Before card: Manual task, time required, effort description
  - After card: Agent output, time savings (e.g., "30 seconds")
- Hardcode 2-3 example agents with sample outputs
- Use a timeout to simulate AI processing

### 6. Impact Metrics
Create `src/components/vision/ImpactMetrics.tsx`:
- 3 large stat cards with target metrics
- Each shows: percentage/number, metric name, description
- Customize metrics:
  [
    { value: "[METRIC_1_VALUE]", label: "[METRIC_1_LABEL]", description: "[METRIC_1_DESC]" },
    { value: "[METRIC_2_VALUE]", label: "[METRIC_2_LABEL]", description: "[METRIC_2_DESC]" },
    { value: "[METRIC_3_VALUE]", label: "[METRIC_3_LABEL]", description: "[METRIC_3_DESC]" }
  ]

## Main Page Component
Create `src/pages/Vision.tsx`:
```tsx
import VisionHero from "@/components/vision/VisionHero";
import VisionPillars from "@/components/vision/VisionPillars";
import FeatureShowcase from "@/components/vision/FeatureShowcase";
import AgentGallery from "@/components/vision/AgentGallery";
import AgentExamples from "@/components/vision/AgentExamples";
import ImpactMetrics from "@/components/vision/ImpactMetrics";

const Vision = () => {
  return (
    <div className="py-8 space-y-16">
      <VisionHero />
      <VisionPillars />
      <FeatureShowcase />
      <AgentGallery />
      <AgentExamples />
      <ImpactMetrics />
    </div>
  );
};

export default Vision;
```

## Routing
Add to App.tsx:
```tsx
<Route path="/vision" element={<Vision />} />
```

Add to navigation sidebar:
```tsx
{ name: "Vision", href: "/vision", icon: Lightbulb }
```

## Design Requirements
- Use shadcn/ui Card component for all cards
- Use Tailwind semantic tokens (text-foreground, text-muted-foreground, bg-card, etc.)
- All colors must use HSL from design system
- Responsive: 1 column mobile, 2 columns tablet, 3 columns desktop
- Card hover: `hover:shadow-lg hover:-translate-y-1 transition-all duration-300`
- Section spacing: `space-y-16` between sections
- Header typography: `text-2xl font-bold text-foreground`
- Subtext: `text-muted-foreground`

## API Functions (if using dynamic agents)
Create `src/Api/aiAgents.ts`:
- listAgents(): Fetch active agents with new fields
- recordAgentView(agentId, userId): Insert view record
- getAgentViewStats(agentId): Get view count and last viewed

## Role-Based Access
- Compare user's role against agent's min_role_required
- If user has access: Show "Go There" button
- If user lacks access: Show lock icon + "Requires [Role] access"
- Use existing useAuth hook for current user's role
```

---

## Example Customization

For a **Sales CRM** project:

```
Project Name: Sales Command Center
Project Tagline: "AI-powered sales acceleration for modern teams"
North Star Goals: 
  - 40% increase in qualified leads
  - 25% reduction in sales cycle time
  - 100% CRM data accuracy

Modules:
  - { title: "Lead Pipeline", route: "/leads", description: "Manage leads from discovery to close" }
  - { title: "Contact Hub", route: "/contacts", description: "360° view of all customer interactions" }
  - { title: "Deal Tracking", route: "/deals", description: "Real-time deal progress and forecasting" }
  - { title: "Email Sequences", route: "/sequences", description: "Automated outreach workflows" }
  - { title: "Analytics", route: "/analytics", description: "Sales performance dashboards" }
  - { title: "Team Goals", route: "/goals", description: "Individual and team quota tracking" }

Impact Metrics:
  - { value: "40%", label: "Lead Conversion", description: "Increase in qualified lead conversion rate" }
  - { value: "25%", label: "Faster Deals", description: "Reduction in average sales cycle time" }
  - { value: "100%", label: "Data Quality", description: "CRM accuracy through automated enrichment" }
```

---

## Checklist for Implementation

- [ ] Create `src/pages/Vision.tsx`
- [ ] Create `src/components/vision/` directory
- [ ] Create VisionHero.tsx with gradient and north star
- [ ] Create VisionPillars.tsx with 3 principle cards
- [ ] Create FeatureShowcase.tsx with module grid
- [ ] Create AgentGallery.tsx with dynamic agent fetch
- [ ] Create AgentDetailModal.tsx with full agent info
- [ ] Create AgentExamples.tsx with before/after demo
- [ ] Create ImpactMetrics.tsx with stat cards
- [ ] Add database columns to ai_agents table (if needed)
- [ ] Create agent_views table with RLS policies
- [ ] Add API functions for agents
- [ ] Add route to App.tsx
- [ ] Add navigation item to sidebar
- [ ] Populate agent data in database
- [ ] Test role-based access in modal
- [ ] Test view tracking

---

## Key Technical Notes

1. **Dynamic Data**: AgentGallery and AgentDetailModal pull from database; other sections are static
2. **View Tracking**: Every modal open records a view for analytics
3. **Role Access**: Client-side role comparison for "Go There" button visibility
4. **Responsive**: All grids adapt from 1→2→3 columns
5. **Animations**: Use Tailwind transitions, not external animation libraries
6. **Semantic Colors**: Never use raw colors like `text-white`; use `text-foreground`
