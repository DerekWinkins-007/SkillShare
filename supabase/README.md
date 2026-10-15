# SkillShare Supabase Backend

This directory contains the database migrations, Edge Functions, configuration, and verification tests for the SkillShare portal.

---

## 1. Directory Structure

```
supabase/
├── config.toml                              # Supabase local development CLI configuration
├── README.md                                # Backend architecture and operational runbook
├── functions/
│   ├── admin-signup/                        # Secure admin creation Edge Function
│   │   └── index.ts
│   └── process-email-outbox/                # Outbox email dispatch Edge Function
│       └── index.ts
├── migrations/
│   ├── 0001_enums_tables.sql                # 10 original tables + 7 supplementary tables
│   ├── 0002_views_rls.sql                   # v_skill_catalogue, helper functions, and RLS
│   ├── 0003_auth_profile_rpcs.sql           # auth trigger, login resolver, profile RPCs
│   ├── 0004_skills_rpcs.sql                 # skills, providers, proposal submission RPCs
│   ├── 0005_admin_rpcs.sql                  # admin CRUD, review queues, stats RPCs
│   ├── 0006a_request_workflow.sql           # request view helper, create and respond RPCs
│   ├── 0006b_request_workflow.sql           # slot response and cancellation RPCs
│   ├── 0006c_request_workflow.sql           # request lists, contact details, sync RPCs
│   └── 0007_feedback_dashboard_reports.sql # feedback, dashboard, reports 1-5, grants
└── tests/
    ├── contract_check.ts                    # Automated contract verification script
    ├── contract_check.cmd                   # Windows runner for contract check
    └── verify.sql                           # Full SQL test harness and behavioral verification
```

---

## 2. Applying Migrations

### In Supabase Dashboard (SQL Editor)
If using Supabase Cloud:
1. Open the **SQL Editor** in your Supabase dashboard.
2. Execute each file in `supabase/migrations/` sequentially from `0001` to `0007`.
3. All tables, functions, triggers, and grants will be created with zero errors.

### Via Supabase CLI (Local Development)
```bash
# Start local Supabase containers (requires Docker)
supabase start

# Apply all migrations
supabase db reset
```

---

## 3. Running Verification Tests

### Automated Adapter Contract Check
To ensure that all RPC functions and parameters called by `src/lib/api/supabase.adapter.ts` exist with matching signatures:
```bash
npx tsx supabase/tests/contract_check.ts
```

### Full SQL Schema and Behavioral Test Harness
Open `supabase/tests/verify.sql` and run it in the Supabase SQL Editor. It runs an end-to-end transaction verifying:
- Presence of all 17 tables and view `v_skill_catalogue`
- Presence of all 37 RPC functions
- Profile completion logic
- State machine trigger enforcement
- Reports 1–5 generation
- Safely rolls back changes upon completion
