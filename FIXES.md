# FIXES.md - Open Item Checklist

All items from AUDIT.md open issues (C1, C2, C3, C4) and G4 are tracked here.

---

## FIX 1 - G4: Real Email Sending in Edge Function

- [x] Copied shared/emailTemplates.ts to supabase/functions/_shared/emailTemplates.ts
- [x] process-email-outbox/index.ts calls renderEmail for subject+body
- [x] Uses Resend REST API (RESEND_API_KEY + MAIL_FROM env vars)
- [x] Resolves login email via supabaseAdmin.auth.admin.getUserById(auth_id)
- [x] Atomically claims rows with claim_outbox_emails RPC (migration 0011)
- [x] verify_jwt = true set in supabase/config.toml
- [x] Returns 200 {"sent": n, "failed": m}
- [x] Committed: 8ed2bc5

Status: DONE

---

## FIX 2 - C3: Confirmation Dialogs for Provider Actions (frames 41, 42)

- [x] Reject Request opens 'Reject this request?' Dialog before calling API
- [x] Decline Slot opens 'Decline this slot?' Dialog before calling API
- [x] Committed: cd498ba

Status: DONE

---

## FIX 3 - C1 + C2: Confirmation Dialogs for Admin Deletes (frames 45, 47)

- [x] Delete Category opens 'Delete this category?' Dialog (AdminCategories.tsx)
- [x] Delete Skill opens 'Delete this skill?' Dialog (AdminSkills.tsx)
- [x] Committed: 3d9b731

Status: DONE

---

## FIX 4 - C4: Reports as Stacked Cards (frames 24, 32)

- [x] Removed dropdown selector and single shared results table
- [x] Five self-contained ReportCard components, each with badge, SQL block, optional dept filter, own table
- [x] Added badge field to REPORT_DEFINITIONS in src/lib/reports.ts
- [x] Committed: 0a58bdc

Status: DONE

---

## FIX 5 - Route Link Verification + UI Cleanup

- [x] All 17 Link/NavLink/navigate targets verified against App.tsx routes - all valid
- [x] No stray UI elements (breadcrumb, Active badge, enrollment pill) found in code
- [x] No code changes needed

Status: DONE

---

## Summary Table

| Fix | Issue | Status |
|-----|-------|--------|
| FIX 1 | G4: Real Resend email dispatch | DONE |
| FIX 2 | C3: Reject/Decline confirmation dialogs | DONE |
| FIX 3 | C1+C2: Delete Category/Skill confirmation dialogs | DONE |
| FIX 4 | C4: Reports stacked cards | DONE |
| FIX 5 | Route link verification and UI cleanup audit | DONE |

All open AUDIT.md items are resolved.
