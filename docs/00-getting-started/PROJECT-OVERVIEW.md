# SJ BD Dashboard - Project Overview

**Last Updated**: 2026-01-12

**Quick Summary:** A comprehensive Business Development and CRM platform for managing deals, campaigns, clients, and integrations.

---

## Overview

SJ BD Dashboard is a full-featured business development platform built with React and Supabase. It provides tools for:

- **Deal Pipeline Management** - Track opportunities from prospecting to close
- **Campaign Management** - Create and manage outreach campaigns
- **Email Automation** - Automated sequences with personalization
- **AI-Powered Features** - Research, content generation, and intelligent suggestions
- **Client Intelligence** - AI-driven client research and relationship management
- **Document Signing** - PandaDoc integration for proposals and contracts
- **CRM Sync** - Bi-directional sync with HubSpot via Control Tower

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TanStack Query |
| UI | Radix UI + shadcn/ui, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth with JWT + RLS |
| Integrations | HubSpot, SendGrid, PandaDoc, OpenAI, ZeroBounce |

---

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd sj-bd-dashboard
npm install

# Configure environment
cp .env.local.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Open http://localhost:8080
```

---

## Key Documentation

### Start Here
- [Documentation Guide](./DOCUMENTATION-GUIDE.md) - How docs are organized
- [Local Testing Guide](./LOCAL_TEST_GUIDE.md) - Set up local development

### Architecture
- [System Architecture](../01-architecture/ARCHITECTURE.md) - Technical deep dive

### Development
- [Development Guide](../03-development/DEVELOPMENT_GUIDE.md) - Coding standards and workflows
- [AI Agents Guide](../06-ai-features/AGENTS.md) - Working with AI features

### Deployment
- [Deployment Checklist](../04-deployment/DEPLOYMENT_CHECKLIST.md) - Production deployment steps

### Features
- [Email Automation](../02-modules/email-automation/EMAIL_AUTOMATION_FLOW.md) - How email sequences work
- [Campaign Management](../02-modules/campaigns/bd-campaigns.md) - Campaign features

### Integrations
- [Zerobounce](../05-integrations/zerobounce/ZEROBOUNCE_INTEGRATION.md) - Email validation
- [Control Tower](../05-integrations/control-tower/CONTROL_TOWER_DATA_SYNC.md) - HubSpot sync
- [PandaDoc](../05-integrations/pandadoc/PANDADOC_IMPLEMENTATION_COMPLETE.md) - Document signing

---

## Project Structure

```
sj-bd-dashboard/
├── src/
│   ├── pages/              # Page components
│   ├── components/         # Reusable components
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service clients
│   └── lib/                # Utilities
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── docs/                   # Documentation (you are here)
└── tests/                  # Test files
```

---

## Role-Based Access

| Role | Access Level |
|------|--------------|
| `super_admin` | Full system access |
| `admin` | Admin panel + all features |
| `manager` | Team management + reports |
| `team_member` | Basic BD features |

---

## Need Help?

- **Main Guide**: See [CLAUDE.md](../../CLAUDE.md) in project root
- **Architecture**: See [ARCHITECTURE.md](../01-architecture/ARCHITECTURE.md)
- **Report Issues**: GitHub Issues

---

**Last Updated:** 2026-01-12 - Initial creation during documentation restructure
