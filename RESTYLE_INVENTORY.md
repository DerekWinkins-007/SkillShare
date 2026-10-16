# Restyle Inventory

## Frame → Route/Component Mapping

| # | Frame Folder | Route / Component | code.html | screen.png |
|---|---|---|---|---|
| 00 | 00-design-system-reference | Design system tokens (not a route) | ✅ | ❌ |
| 01 | 01-login-student-sign-in | `/login` → `Login.tsx` | ✅ | ✅ |
| 02 | 02-signup-student-sign-up | `/signup` → `StudentSignup.tsx` | ✅ | ✅ |
| 03 | 03-admin-login-admin-sign-in | `/admin/login` → `AdminLogin.tsx` | ✅ | ✅ |
| 04 | 04-admin-signup-admin-sign-up | `/admin/signup` → `AdminSignup.tsx` | ✅ | ✅ |
| 05 | 05-profile-setup-step-1-basics | `/profile/setup` step 1 → `ProfileSetup.tsx` | ✅ | ✅ |
| 06 | 06-profile-setup-step-2-contact | `/profile/setup` step 2 → `ProfileSetup.tsx` | ✅ | ✅ |
| 07 | 07-profile-setup-step-3-skills | `/profile/setup` step 3 → `ProfileSetup.tsx` | ✅ | ✅ |
| 08 | 08-profile-edit | `/profile/edit` → `ProfileEdit.tsx` | ✅ | ✅ |
| 09 | 09-dashboard | `/dashboard` → `StudentDashboard.tsx` | ✅ | ✅ |
| 10 | 10-public-profile | `/students/:studentid` → `PublicProfile.tsx` | ✅ | ✅ |
| 11 | 11-catalogue-browse-tab | `/catalogue` Browse tab → `Catalogue.tsx` | ✅ | ✅ |
| 12 | 12-catalogue-my-skills-tab | `/catalogue` My Skills tab → `Catalogue.tsx` | ✅ | ✅ |
| 13 | 13-skill-detail | `/skills/:skillid` → `SkillDetail.tsx` | ✅ | ✅ |
| 14 | 14-requests-received-tab | `/requests` Received tab → `RequestsList.tsx` | ✅ | ✅ |
| 15 | 15-requests-sent-tab | `/requests` Sent tab → `RequestsList.tsx` | ✅ | ✅ |
| 16 | 16-request-pending-provider | `/requests/:requestid` (pending, provider view) → `RequestDetail.tsx` | ✅ | ✅ |
| 17 | 17-request-pending-requester | `/requests/:requestid` (pending, requester view) → `RequestDetail.tsx` | ✅ | ✅ |
| 18 | 18-request-accepted-requester | `/requests/:requestid` (accepted, requester view) → `RequestDetail.tsx` | ✅ | ✅ |
| 19 | 19-request-confirmed | `/requests/:requestid` (confirmed) → `RequestDetail.tsx` | ✅ | ✅ |
| 20 | 20-request-completed-no-feedback | `/requests/:requestid` (completed, no feedback) → `RequestDetail.tsx` | ✅ | ✅ |
| 21 | 21-request-cancelled | `/requests/:requestid` (cancelled) → `RequestDetail.tsx` | ✅ | ✅ |
| 22 | 22-proposals-category-requests-tab | `/proposals` Category Requests tab → `StudentProposals.tsx` | ✅ | ✅ |
| 23 | 23-proposals-skill-proposals-tab | `/proposals` Skill Proposals tab → `StudentProposals.tsx` | ✅ | ✅ |
| 24 | 24-reports-student | `/reports` (student navbar) → `Reports.tsx` | ✅ | ✅ |
| 25 | 25-admin-overview | `/admin` → `AdminDashboard.tsx` | ✅ | ✅ |
| 26 | 26-admin-categories-tab | `/admin/categories` Categories tab → `AdminCategories.tsx` | ✅ | ✅ |
| 27 | 27-admin-category-requests-tab | `/admin/categories` Category Requests tab → `AdminCategories.tsx` | ✅ | ✅ |
| 28 | 28-admin-skills-tab | `/admin/skills` Skills tab → `AdminSkills.tsx` | ✅ | ✅ |
| 29 | 29-admin-skill-proposals-tab | `/admin/skills` Skill Proposals tab → `AdminSkills.tsx` | ✅ | ✅ |
| 30 | 30-admin-requests | `/admin/requests` → `AdminRequests.tsx` | ✅ | ✅ |
| 31 | 31-admin-students | `/admin/students` → `AdminStudents.tsx` | ✅ | ✅ |
| 32 | 32-reports-admin | `/reports` (admin navbar) → `Reports.tsx` | ✅ | ✅ |
| 33 | 33-notification-panel-and-account-menu | Notification panel + account menu → `Layout.tsx` | ✅ | ✅ |
| 34 | 34-dialog-request-new-category | Dialog: Request new category → `StudentProposals.tsx` | ✅ | ✅ |
| 35 | 35-dialog-propose-new-skill | Dialog: Propose new skill → `StudentProposals.tsx` | ✅ | ✅ |
| 36 | 36-dialog-add-skills | Dialog: Add skills → `ProfileSetup.tsx` / `ProfileEdit.tsx` / `Catalogue.tsx` | ✅ | ✅ |
| 37 | 37-dialog-send-skill-request | Dialog: Send skill request → `SkillDetail.tsx` | ✅ | ✅ |
| 38 | 38-dialog-propose-slot-offline | Dialog: Propose slot (offline) → `RequestDetail.tsx` | ✅ | ✅ |
| 39 | 39-dialog-propose-slot-online | Dialog: Propose slot (online) → `RequestDetail.tsx` | ✅ | ✅ |
| 40 | 40-dialog-cancel-request | Dialog: Cancel request → `RequestDetail.tsx` | ✅ | ✅ |
| 41 | 41-dialog-reject-request | Dialog: Reject request → `RequestDetail.tsx` | ✅ | ✅ |
| 42 | 42-dialog-decline-slot | Dialog: Decline slot → `RequestDetail.tsx` | ✅ | ✅ |
| 43 | 43-dialog-give-feedback | Dialog: Give feedback → `RequestDetail.tsx` / `Layout.tsx` | ✅ | ✅ |
| 44 | 44-dialog-add-category | Dialog: Add category → `AdminCategories.tsx` | ✅ | ✅ |
| 45 | 45-dialog-delete-category | Dialog: Delete category → `AdminCategories.tsx` | ✅ | ✅ |
| 46 | 46-dialog-add-skill | Dialog: Add skill → `AdminSkills.tsx` | ✅ | ✅ |
| 47 | 47-dialog-delete-skill | Dialog: Delete skill → `AdminSkills.tsx` | ✅ | ✅ |
| 48 | 48-dialog-review-proposal | Dialog: Review proposal → `AdminSkills.tsx` / `AdminCategories.tsx` | ✅ | ✅ |

## Remote Dependencies Found in Stitch HTML (must NOT be used)

All Stitch HTML files reference:
- `https://cdn.tailwindcss.com` (CDN Tailwind play script)
- `https://fonts.googleapis.com/css2?family=Inter:wght@100..900` (Google Fonts CDN)
- `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:...` (Google Fonts icon CDN)

**Replacements:**
- Tailwind CSS → local `tailwindcss` npm package with PostCSS
- Inter → `@fontsource/inter` npm package
- JetBrains Mono → `@fontsource/jetbrains-mono` npm package
- Material Symbols → `material-symbols` npm package

## Sample/Filler Data in Stitch HTML

All Stitch designs show skeleton loading states (pulsing grey bars) for data slots — no sample/filler text found. The designs correctly represent loading states.

## Links in Stitch HTML

All links use `href="#"` — these are Stitch export artifacts and will NOT be copied. Real React Router `<Link>` components are already in place in the app.

## Notes

- Frame 00 has no screen.png (HTML only, used as design-system reference)
- Frame 13 had a duplicate in export (byte-identical to frame 00) — discarded
- DESIGN.md is consistent across all four export batches
