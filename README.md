# INFINITY ZERO — AI Friction Elimination Engine

**Don't Manage Your Work. Eliminate What Slows It Down.**
A validation prototype by **Infinity Web & Apps**.

Infinity ZERO lets people describe a recurring workflow, finds the friction in it (repetition, waiting, copying, searching…), recommends practical fixes, simulates the time saved, and collects structured customer feedback so the founders can decide what to build next.

> Understand Work → Detect Friction → Recommend Improvement → Simulate Benefits → Measure Results

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — everything works without keys
npm run dev                  # http://localhost:3000
```

With no keys configured the app runs fully in **demo mode**:

- Sample scenarios return prewritten analyses labelled **“Sample Analysis”**.
- Custom workflows use a rule-based analyzer (keyword patterns), also labelled as a sample/demo, never as AI.
- Workflows, feedback and pricing interest are stored in the browser (`localStorage`) and labelled “this device only”.

## Features

| Area | Route | What it does |
|---|---|---|
| Overview (Zero Command Center) | `/` | Metrics (estimated vs measured kept separate), interactive workflow diagram |
| Analyze Workflow | `/analyze` | Form → AI or demo analysis: summary, friction, causes, improvements, savings, difficulty, limitations, assumptions, next action |
| Friction Explorer | `/friction` | Impact × effort map, filters, side panel, “Explore Solution” → Lab |
| Improvement Lab | `/lab` | Animated before/after, step inspection, accept/reject, simulator, save plan, mark implemented, record measurements |
| My Workflows | `/workflows` | Saved workflows, plans, delete |
| Impact Analytics | `/analytics` | Recharts dashboards with date ranges; demo / estimated / measured clearly separated; table view for every chart |
| Customer Feedback | `/feedback` | 3 core questions with conditional follow-ups + optional research questions; anonymous; duplicate-safe |
| Live Demo | `/demo` | 6-step, ~3-minute guided flow, no sign-up |
| Pricing | `/pricing` | Proposed ₹ plans; CTAs register interest only (no payments) |
| Founder Insights | `/founder` | Private: KPIs, distributions, willingness to pay, word frequency, AI summary with citations, configurable validation verdict, CSV export |
| Settings | `/settings` | Optional magic-link sign-in, hourly value, motion preference, delete data |

### Savings formulas (always shown as estimates)

- Time saved per run = current − improved
- Weekly = per run × runs per week
- Monthly = weekly × 4.33
- Money is only shown when the user enters an hourly value.

AI never outputs minutes: it returns each step's *share* of the user's own stated time and a conservative reduction %, and the server derives all durations from the user's input.

## AI provider chain (free tiers)

`src/lib/ai/providers.ts` calls OpenAI-compatible endpoints in order: **Groq → Google Gemini → OpenRouter (free model) → Cerebras**. Any provider without a key is skipped; a 429, error, timeout or schema-invalid response moves on to the next. If all fail, the labelled demo analyzer is used and the UI lists what was tried. Reorder with `AI_PROVIDER_ORDER`. All responses are validated with Zod.

## Supabase (optional)

1. Create a project and run `supabase/migrations/20261107000000_init.sql` (SQL editor or `supabase db push`).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. In Auth → URL configuration, add `https://<your-domain>/auth/callback` as a redirect URL.
4. Sign in from **Settings**, then make yourself a founder:
   `update public.profiles set role = 'founder' where id = '<your user id>';`

Tables: `profiles, user_settings, workflows, workflow_steps, analyses, friction_points, improvement_plans, improvement_measurements, feedback_responses, feedback_feature_requests, pricing_interest` — UUID keys, FKs with cascades, timestamps, check constraints, indexes, and RLS:

- Workflow data: owner-only (founders cannot read other users' workflows).
- Feedback & pricing interest: anyone may insert; only `role = 'founder'` may read. Feedback stores no user id, email or IP.
- Duplicate feedback is prevented by a unique `submission_key`.

## Founder access

`/founder` is unlocked by either `FOUNDER_PASSCODE` (entered on the page) or a signed-in Supabase user with the founder role. If neither a passcode nor Supabase is configured, the dashboard is open but only shows data stored in that same browser — **set `FOUNDER_PASSCODE` for any public deployment.**

## Deploy to Vercel

1. Import the repository in Vercel (framework: Next.js, no build overrides needed).
2. Add the environment variables from `.env.example` you want to use.
3. Deploy. Without Supabase, each visitor's data lives in their own browser — for collecting feedback across many people's devices, configure Supabase.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint`

## Honesty principles

No fabricated testimonials, no fake metrics, no fake payments, no hidden tracking. Sample content is always labelled; estimates are never presented as measurements; the validation verdict never claims product-market fit and requires a minimum sample size.
