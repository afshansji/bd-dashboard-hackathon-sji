# Documentation Guide

**Last Updated**: 2026-01-12

This guide explains how the SJ BD Dashboard documentation is organized and provides guidelines for adding or maintaining documentation.

---

## Structure Overview

Our documentation is organized in numbered layers for easy navigation:

| Folder                | Purpose                              | Audience                |
| --------------------- | ------------------------------------ | ----------------------- |
| `00-getting-started/` | Project onboarding, setup guides     | New team members        |
| `01-architecture/`    | System design, data flow, tech stack | Architects, senior devs |
| `02-modules/`         | Feature-specific documentation       | Feature owners          |
| `03-development/`     | Dev workflows, coding standards      | All developers          |
| `04-deployment/`      | Infrastructure, deployment guides    | DevOps, deployment team |
| `05-integrations/`    | Third-party integration docs         | Integration owners      |
| `06-ai-features/`     | AI/ML specific documentation         | AI feature developers   |
| `archive/`            | Historical/deprecated docs           | Reference only          |

---

## Directory Contents

### 00-getting-started/

- `DOCUMENTATION-GUIDE.md` - This file
- `LOCAL_TEST_GUIDE.md` - Local testing setup
- `LOVABLE_SETUP_GUIDE.md` - Lovable platform setup
- `START_HERE_LOCAL_TESTING.md` - Quick start for local dev

### 01-architecture/

- `ARCHITECTURE.md` - Comprehensive system architecture

### 02-modules/

- `campaigns/` - Campaign management features
- `email-automation/` - Email sequences and automation
- `notifications/` - In-app and email notifications
- `pipeline/` - Deal pipeline features
- `CONTACT_EDITING_FEATURE.md` - Contact management

### 03-development/

- `DEVELOPMENT_GUIDE.md` - Development workflows
- `DEVELOPMENT_PLAN.md` - Development roadmap

### 04-deployment/

- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `DEPLOY_INSTRUCTIONS.md` - Step-by-step deployment
- `PRODUCTION_DEPLOYMENT_INSTRUCTIONS.md` - Production deployment
- `QUICK_DEPLOY.md` - Quick reference for deployment

### 05-integrations/

- `control-tower/` - HubSpot/Control Tower sync
- `exa/` - Exa research integration
- `ghl/` - GoHighLevel integration
- `n8n/` - n8n workflow automation
- `pandadoc/` - Document signing
- `sendgrid/` - Email delivery
- `zerobounce/` - Email validation

### 06-ai-features/

- `AGENTS.md` - AI agent development guide
- `ai-agent-framework.md` - AI framework overview

### archive/

- `bug-fixes/` - Historical bug fix documentation
- `deployment-logs/` - Past deployment records
- `session-notes/` - Development session summaries
- `misc/` - Other archived documents

---

## Before You Edit

### Do:

- Use clear, descriptive file names in UPPERCASE-WITH-DASHES.md format
- Include a "Last Updated" section with date and summary of changes
- Link to related docs using relative paths
- Use the standard template below
- Keep files focused (one feature = one file)
- Add your doc to the appropriate category folder

### Don't:

- Leave files at project root (except README.md, CLAUDE.md)
- Use vague file names (notes.md, todo.md, info.md)
- Create nested folders beyond 2 levels (docs/01-architecture/subfolder/ max)
- Mix unrelated topics in one file
- Duplicate information across multiple files

---

## Standard Documentation Template

Use this structure for every new documentation file:

```markdown
# [Feature/Module Name]

**Last Updated**: YYYY-MM-DD

**Quick Summary:** One-line description of what this is.

## Overview

[2-3 paragraphs explaining the purpose and scope]

## Key Concepts

- **Concept 1:** Brief explanation
- **Concept 2:** Brief explanation
- **Concept 3:** Brief explanation

## How It Works

[Step-by-step explanation or architecture diagram description]

## Setup/Configuration

[If applicable: how to set this up]

### Prerequisites

- List what's needed

### Steps

1. First step
2. Second step
3. etc.

## Usage Examples

[Show how to use this feature with code examples]

## API Reference

[If applicable: endpoints, parameters, responses]

## Common Issues

| Issue     | Solution   |
| --------- | ---------- |
| Problem A | Solution A |
| Problem B | Solution B |

## Related Documentation

- [Link to related doc 1](../path/to/doc1.md)
- [Link to related doc 2](../path/to/doc2.md)

---

**Last Updated:** YYYY-MM-DD - [What changed]
```

---

## File Naming Convention

| Type                  | Pattern                        | Example                         |
| --------------------- | ------------------------------ | ------------------------------- |
| Status files          | `[FEATURE]-STATUS.md`          | `DEPLOYMENT-STATUS.md`          |
| Implementation guides | `[FEATURE]-GUIDE.md`           | `TESTING-GUIDE.md`              |
| Setup/configuration   | `[SERVICE]-SETUP.md`           | `SUPABASE-SETUP.md`             |
| Architecture docs     | `[COMPONENT]-ARCHITECTURE.md`  | `DATABASE-ARCHITECTURE.md`      |
| Overview docs         | `[TOPIC]-OVERVIEW.md`          | `INTEGRATIONS-OVERVIEW.md`      |
| Troubleshooting       | `[FEATURE]-TROUBLESHOOTING.md` | `ZEROBOUNCE-TROUBLESHOOTING.md` |

---

## When Adding New Docs

1. **Determine the category** using the folder structure above
2. **Create the file** in the appropriate `/docs/` folder
3. **Use the standard template** from this guide
4. **Add "Last Updated"** section at the bottom
5. **Link from related docs** to make it discoverable
6. **Update this guide** if adding a new category

---

## Quick Links

### Getting Started

- [Local Testing Guide](./LOCAL_TEST_GUIDE.md)
- [Lovable Setup Guide](./LOVABLE_SETUP_GUIDE.md)

### Core Documentation

- [Architecture Overview](../01-architecture/ARCHITECTURE.md)
- [Development Guide](../03-development/DEVELOPMENT_GUIDE.md)
- [Deployment Checklist](../04-deployment/DEPLOYMENT_CHECKLIST.md)

### AI Development

- [AI Agents Guide](../06-ai-features/AGENTS.md)

### Integrations

- [Control Tower Sync](../05-integrations/control-tower/CONTROL_TOWER_DATA_SYNC.md)
- [Zerobounce Integration](../05-integrations/zerobounce/ZEROBOUNCE_INTEGRATION.md)
- [PandaDoc Integration](../05-integrations/pandadoc/PANDADOC_IMPLEMENTATION_COMPLETE.md)

---

## For AI Assistants

When working on this codebase:

1. **Read this guide first** to understand documentation structure
2. **Check existing docs** before creating new ones
3. **Follow the template** for consistency
4. **Update existing docs** rather than creating duplicates
5. **Archive outdated docs** instead of deleting them
6. **Use relative links** between documentation files

---

## Archived Documentation

The `archive/` folder contains historical documentation that may still be useful for reference:

- **bug-fixes/** - Historical bug fix documentation and troubleshooting
- **deployment-logs/** - Past deployment records and release notes
- **session-notes/** - Development session summaries
- **misc/** - Migration guides and other archived content

These files are preserved for historical reference but should not be used as current guidance.

---

**Questions about documentation?** Check CLAUDE.md for the main project guide or ask in the team channel.
