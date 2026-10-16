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
| 14 | 14-requests-received-tab | `/requests` Received tab → `RequestsList.tsx` | DONE | Restyled with segmented tabs, status filter, and requests table |
| 15 | 15-requests-sent-tab | `/requests` Sent tab → `RequestsList.tsx` | DONE | Restyled with sent requests view and status badge |
| 16 | 16-request-pending-provider | `/requests/:requestid` (pending, provider) → `RequestDetail.tsx` | DONE | Restyled with action buttons and slot proposal dialog |
| 17 | 17-request-pending-requester | `/requests/:requestid` (pending, requester) → `RequestDetail.tsx` | DONE | Restyled pending view for learner with role indicators |
| 18 | 18-request-accepted-requester | `/requests/:requestid` (accepted, requester) → `RequestDetail.tsx` | DONE | Restyled with slot agreement and decline controls |
| 19 | 19-request-confirmed | `/requests/:requestid` (confirmed) → `RequestDetail.tsx` | DONE | Restyled with meeting details and counterpart contact card |
| 20 | 20-request-completed-no-feedback | `/requests/:requestid` (completed) → `RequestDetail.tsx` | DONE | Restyled with feedback submission form and rating |
| 21 | 21-request-cancelled | `/requests/:requestid` (cancelled) → `RequestDetail.tsx` | DONE | Restyled with cancellation reason banner |
| 22 | 22-proposals-category-requests-tab | `/proposals` Category Requests → `StudentProposals.tsx` | DONE | Restyled with category requests table and dialog trigger |
| 23 | 23-proposals-skill-proposals-tab | `/proposals` Skill Proposals → `StudentProposals.tsx` | DONE | Restyled with skill proposals table and dialog trigger |
| 24 | 24-reports-student | `/reports` (student) → `Reports.tsx` | DONE | Restyled with report selector, SQL preview, and results table |
| 25 | 25-admin-overview | `/admin` → `AdminDashboard.tsx` | DONE | Restyled with StatCards, system aggregates, status breakdown table |
| 26 | 26-admin-categories-tab | `/admin/categories` Categories → `AdminCategories.tsx` | DONE | Restyled with category listing, creation dialog, and deletion dialog |
| 27 | 27-admin-category-requests-tab | `/admin/categories` Category Requests → `AdminCategories.tsx` | DONE | Restyled with review queue, approve/reject mutations, and note input |
| 28 | 28-admin-skills-tab | `/admin/skills` Skills → `AdminSkills.tsx` | DONE | Restyled with skills table, creation dialog, and deletion dialog |
| 29 | 29-admin-skill-proposals-tab | `/admin/skills` Skill Proposals → `AdminSkills.tsx` | DONE | Restyled with proposals review queue, note input, approve/reject |
| 30 | 30-admin-requests | `/admin/requests` → `AdminRequests.tsx` | DONE | Restyled with status filter, oversight table, and status badges |
| 31 | 31-admin-students | `/admin/students` → `AdminStudents.tsx` | DONE | Restyled with student roster table, profile complete badges |
| 32 | 32-reports-admin | `/reports` (admin) → `Reports.tsx` | DONE | Restyled with identical institutional reporting capabilities |
| 33 | 33-notification-panel-and-account-menu | Notification panel + account menu → `Layout.tsx` | DONE | Restyled with top navigation, active route styling, notification panel, and feedback dialog |
| 34 | 34-dialog-request-new-category | Dialog: Request new category → `StudentProposals.tsx` | DONE | Restyled category request modal with validation |
| 35 | 35-dialog-propose-new-skill | Dialog: Propose new skill → `StudentProposals.tsx` | DONE | Restyled skill proposal modal with category selector |
| 36 | 36-dialog-add-skills | Dialog: Add skills → `ProfileSetup`/`Edit`/`Catalogue` | DONE | Restyled with search input and skill selection |
| 37 | 37-dialog-send-skill-request | Dialog: Send skill request → `SkillDetail.tsx` | DONE | Restyled request session triggers with mutation feedback |
| 38 | 38-dialog-propose-slot-offline | Dialog: Propose slot (offline) → `RequestDetail.tsx` | DONE | Restyled offline slot proposal with location input |
| 39 | 39-dialog-propose-slot-online | Dialog: Propose slot (online) → `RequestDetail.tsx` | DONE | Restyled online slot proposal with video link input |
| 40 | 40-dialog-cancel-request | Dialog: Cancel request → `RequestDetail.tsx` | DONE | Restyled cancel dialog with validation |
| 41 | 41-dialog-reject-request | Dialog: Reject request → `RequestDetail.tsx` | DONE | Integrated reject mutation with status badge update |
| 42 | 42-dialog-decline-slot | Dialog: Decline slot → `RequestDetail.tsx` | DONE | Integrated decline mutation |
| 43 | 43-dialog-give-feedback | Dialog: Give feedback → `RequestDetail.tsx` / `Layout.tsx` | DONE | Restyled feedback dialog and rating controls |
| 44 | 44-dialog-add-category | Dialog: Add category → `AdminCategories.tsx` | DONE | Restyled add category dialog with validation |
| 45 | 45-dialog-delete-category | Dialog: Delete category → `AdminCategories.tsx` | DONE | Restyled delete category confirmation dialog |
| 46 | 46-dialog-add-skill | Dialog: Add skill → `AdminSkills.tsx` | DONE | Restyled add skill dialog with category selector |
| 47 | 47-dialog-delete-skill | Dialog: Delete skill → `AdminSkills.tsx` | DONE | Restyled delete skill confirmation dialog |
| 48 | 48-dialog-review-proposal | Dialog: Review proposal → `AdminSkills.tsx` / `AdminCategories.tsx` | DONE | Integrated review actions with note inputs |

## Implementation Rules
- Visual layer only: no logic/hook/API/type changes.
- All `data-testid` preserved exactly.
- Local fonts and icons only (`material-symbols`).
- Real router links; no `href="#"`.
- Loading states use skeletons. Empty states use structured empty states.
