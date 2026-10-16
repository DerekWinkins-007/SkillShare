# Restyle Progress & Notes

## Frame Status Checklist (00-48)

| # | Frame Name | Route / Component | Status | Notes |
|---|---|---|---|---|
| 00 | 00-design-system-reference | Design system tokens / index.css | DONE | Tailwind v4 @theme, Inter, JetBrains Mono, Material Symbols |
| 01 | 01-login-student-sign-in | `/login` → `Login.tsx` | DONE | Restyled with high fidelity, preserving all testids and logic |
| 02 | 02-signup-student-sign-up | `/signup` → `StudentSignup.tsx` | DONE | Restyled with high fidelity, preserving confirmation screen and validation |
| 03 | 03-admin-login-admin-sign-in | `/admin/login` → `AdminLogin.tsx` | DONE | Restyled with high fidelity |
| 04 | 04-admin-signup-admin-sign-up | `/admin/signup` → `AdminSignup.tsx` | DONE | Restyled with high fidelity, keyphrase input |
| 05 | 05-profile-setup-step-1-basics | `/profile/setup` step 1 → `ProfileSetup.tsx` | DONE | Restyled with segmented progress indicator, high fidelity basics form |
| 06 | 06-profile-setup-step-2-contact | `/profile/setup` step 2 → `ProfileSetup.tsx` | DONE | Restyled with contact info fields, helpers, and validation |
| 07 | 07-profile-setup-step-3-skills | `/profile/setup` step 3 → `ProfileSetup.tsx` | DONE | Restyled with my-skills chips and searchable catalogue table |
| 08 | 08-profile-edit | `/profile/edit` → `ProfileEdit.tsx` | DONE | Restyled with high fidelity 2-column layout and status alerts |
| 09 | 09-dashboard | `/dashboard` → `StudentDashboard.tsx` | DONE | Restyled with StatCards, sessions table, feedback due list |
| 10 | 10-public-profile | `/students/:studentid` → `PublicProfile.tsx` | DONE | Restyled with avatar header, rating stats, skills chips, and reviews |
| 11 | 11-catalogue-browse-tab | `/catalogue` Browse tab → `Catalogue.tsx` | DONE | Restyled with categories sidebar, search, and available skills table |
| 12 | 12-catalogue-my-skills-tab | `/catalogue` My Skills tab → `Catalogue.tsx` | DONE | Restyled with teaching skills list, add action, and empty state |
| 13 | 13-skill-detail | `/skills/:skillid` → `SkillDetail.tsx` | DONE | Restyled with category pill, providers table, ratings, and request actions |
| 14 | 14-requests-received-tab | `/requests` Received tab → `RequestsList.tsx` | TODO | |
| 15 | 15-requests-sent-tab | `/requests` Sent tab → `RequestsList.tsx` | TODO | |
| 16 | 16-request-pending-provider | `/requests/:requestid` (pending, provider) → `RequestDetail.tsx` | TODO | |
| 17 | 17-request-pending-requester | `/requests/:requestid` (pending, requester) → `RequestDetail.tsx` | TODO | |
| 18 | 18-request-accepted-requester | `/requests/:requestid` (accepted, requester) → `RequestDetail.tsx` | TODO | |
| 19 | 19-request-confirmed | `/requests/:requestid` (confirmed) → `RequestDetail.tsx` | TODO | |
| 20 | 20-request-completed-no-feedback | `/requests/:requestid` (completed) → `RequestDetail.tsx` | TODO | |
| 21 | 21-request-cancelled | `/requests/:requestid` (cancelled) → `RequestDetail.tsx` | TODO | |
| 22 | 22-proposals-category-requests-tab | `/proposals` Category Requests → `StudentProposals.tsx` | TODO | |
| 23 | 23-proposals-skill-proposals-tab | `/proposals` Skill Proposals → `StudentProposals.tsx` | TODO | |
| 24 | 24-reports-student | `/reports` (student) → `Reports.tsx` | TODO | |
| 25 | 25-admin-overview | `/admin` → `AdminDashboard.tsx` | TODO | |
| 26 | 26-admin-categories-tab | `/admin/categories` Categories → `AdminCategories.tsx` | TODO | |
| 27 | 27-admin-category-requests-tab | `/admin/categories` Category Requests → `AdminCategories.tsx` | TODO | |
| 28 | 28-admin-skills-tab | `/admin/skills` Skills → `AdminSkills.tsx` | TODO | |
| 29 | 29-admin-skill-proposals-tab | `/admin/skills` Skill Proposals → `AdminSkills.tsx` | TODO | |
| 30 | 30-admin-requests | `/admin/requests` → `AdminRequests.tsx` | TODO | |
| 31 | 31-admin-students | `/admin/students` → `AdminStudents.tsx` | TODO | |
| 32 | 32-reports-admin | `/reports` (admin) → `Reports.tsx` | TODO | |
| 33 | 33-notification-panel-and-account-menu | Notification panel + account menu → `Layout.tsx` | TODO | |
| 34 | 34-dialog-request-new-category | Dialog: Request new category → `StudentProposals.tsx` | TODO | |
| 35 | 35-dialog-propose-new-skill | Dialog: Propose new skill → `StudentProposals.tsx` | TODO | |
| 36 | 36-dialog-add-skills | Dialog: Add skills → `ProfileSetup`/`Edit`/`Catalogue` | TODO | |
| 37 | 37-dialog-send-skill-request | Dialog: Send skill request → `SkillDetail.tsx` | DONE | Restyled request session triggers with mutation feedback |
| 38 | 38-dialog-propose-slot-offline | Dialog: Propose slot (offline) → `RequestDetail.tsx` | TODO | |
| 39 | 39-dialog-propose-slot-online | Dialog: Propose slot (online) → `RequestDetail.tsx` | TODO | |
| 40 | 40-dialog-cancel-request | Dialog: Cancel request → `RequestDetail.tsx` | TODO | |
| 41 | 41-dialog-reject-request | Dialog: Reject request → `RequestDetail.tsx` | TODO | |
| 42 | 42-dialog-decline-slot | Dialog: Decline slot → `RequestDetail.tsx` | TODO | |
| 43 | 43-dialog-give-feedback | Dialog: Give feedback → `RequestDetail.tsx` / `Layout.tsx` | TODO | |
| 44 | 44-dialog-add-category | Dialog: Add category → `AdminCategories.tsx` | TODO | |
| 45 | 45-dialog-delete-category | Dialog: Delete category → `AdminCategories.tsx` | TODO | |
| 46 | 46-dialog-add-skill | Dialog: Add skill → `AdminSkills.tsx` | TODO | |
| 47 | 47-dialog-delete-skill | Dialog: Delete skill → `AdminSkills.tsx` | TODO | |
| 48 | 48-dialog-review-proposal | Dialog: Review proposal → `AdminSkills.tsx` / `AdminCategories.tsx` | TODO | |

## Implementation Rules
- Visual layer only: no logic/hook/API/type changes.
- All `data-testid` preserved exactly.
- Local fonts and icons only (`material-symbols`).
- Real router links; no `href="#"`.
- Loading states use skeletons. Empty states use structured empty states.
