# Feature: Opportunity Intelligence Agent

**Status**: 🔄 In Progress
**Author**: SJ Innovation
**Date**: June 28, 2026
**Last Updated**: June 28, 2026

**Related docs**:
- [Organizational Memory Platform](./org-memory-platform.md)
- Upwork Jobs module (`/bd/upwork-jobs`)

---

## Overview

The Opportunity Intelligence Agent connects imported Upwork jobs with Organizational Memory to answer:

> "Should SJ Innovation pursue this opportunity, and why?"

It is an explainable business decision engine — not a proposal generator or chat interface. Recommendations are computed deterministically from weighted scores; the LLM only explains evidence-backed reasoning.

## User Stories

- As a **BD rep**, I want to analyze an imported Upwork job against our indexed project knowledge so that I can prioritize pursuit decisions.
- As a **sales lead**, I want a structured PURSUE / REVIEW / IGNORE recommendation with confidence and citations so that I can trust the output.
- As a **platform engineer**, I want analyses cached in the database so future agents (proposals, outreach) can reuse them.

## Architecture

```
UpworkJobCard → opportunity-intelligence (Edge Function)
                      ↓
              runOrgMemoryQueryFallback (reuse)
                      ↓
              Deterministic scoring engine
                      ↓
              LLM explanation (optional)
                      ↓
              opportunity_analysis table
```

## Scoring Weights

| Factor | Weight |
|--------|--------|
| Technology match | 40% |
| Past project similarity | 30% |
| Domain match | 20% |
| Risk (inverted) | 10% |

## Recommendation Thresholds

| Score | Recommendation |
|-------|----------------|
| ≥ 75 | PURSUE |
| ≥ 45 | REVIEW |
| < 45 | IGNORE |

## API

**Edge Function:** `opportunity-intelligence`

- `GET ?jobId=<uuid>` — fetch cached analysis
- `POST { jobId, force? }` — run or return cached analysis

## Database

Table: `opportunity_analysis` (one row per job, upserted on regenerate)

---

## Status Checklist

- [x] Migration: `opportunity_analysis`
- [x] Edge Function: `opportunity-intelligence`
- [x] Deterministic scoring module
- [x] UI: Analyze button + collapsible panel on job cards
- [ ] Deploy Edge Function to Supabase project
- [ ] Apply migration to remote database
