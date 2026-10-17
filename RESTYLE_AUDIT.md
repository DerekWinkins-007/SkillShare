# RESTYLE AUDIT REPORT

**Base commit:** `a4f6737` (Step 0: exclude stitch-screens from ESLint / Add Stitch screens `6b27788`)  
**Head commit:** `598b0b2` (before fixes)  
**Date:** 2026-10-16  

---

## Audit Checklist Findings

| Check | PASS/FAIL | Evidence (file:line) |
|---|---|---|
| **1. Dead links**<br>List every `<Link>`, `<NavLink>`, `<a href>`, `navigate()` and `Navigate` target in `src/`. Each must resolve to a route in `App.tsx`. No `href="#"`, no breadcrumbs or links to routes that do not exist (check AdminStudents, AdminRequests, PublicProfile, Layout, every page header). | **FAIL** | `src/pages/PublicProfile.tsx:61` contains a "Back to catalogue" link not present in frame 10 or original app.<br>`src/components/Layout.tsx:145` contains Profile link directly in student navbar rather than strictly in the Account menu. |
| **2. Allowed navigation only**<br>Student navbar has Dashboard, Catalogue, Requests, Proposals, Reports; account menu has My profile (`/students/<own studentid>`), Edit profile (`/profile/edit`), Sign out. Admin navbar has Overview, Categories, Skills, Requests, Students, Reports and Sign out. Verify the ACCOUNT MENU exists in Layout and works (frame 33). | **FAIL** | `src/components/Layout.tsx:145` has Profile link in the top student navbar.<br>`src/components/Layout.tsx:156` uses label "Admin Dashboard" instead of "Overview".<br>`src/components/Layout.tsx:208` does not render an Account Menu dropdown popover per frame 33 with "My profile", "Edit profile", and "Sign out". |
| **3. Forbidden extras**<br>No avatars, photos, illustrations, breadcrumbs, enrollment pills, taglines, forgot-password, terms/privacy/help/footer links, or anything not in the designs and the original app. Check PublicProfile (frame 10), AdminStudents (31), AdminRequests (30), Dashboard (09). | **FAIL** | `src/pages/PublicProfile.tsx:73` has initials avatar circle.<br>`src/pages/admin/AdminStudents.tsx:25,30` contains "Total Enrolled" enrollment pill and altered title "(Admin Oversight)".<br>`src/pages/admin/AdminRequests.tsx:24` has altered title "(Admin Oversight)".<br>`src/pages/StudentDashboard.tsx:50` has extraneous "Active" status pill. |
| **4. Frame fidelity checks**<br>Reports must be five stacked cards, each with title, SQL block and result table (frames 24/32), not a selector. Dialogs 41 (reject request) and 42 (decline slot) must exist as confirmation dialogs with exact titles and buttons. Check dialogs 34-48 against screen.png. | **FAIL** | `src/pages/Reports.tsx:53` renders a single report with a `<select>` dropdown selector instead of five stacked cards per frames 24 & 32.<br>`src/pages/RequestDetail.tsx:329,356` triggers reject and decline mutations directly with no confirmation dialogs 41 ("Reject this request?") or 42 ("Decline this slot?"). |
| **5. data-testid preservation**<br>Extract every data-testid in `src/` at BASE and at HEAD. Any testid present at BASE and missing at HEAD is a FAIL; restore it. | **PASS** | 185 unique data-testids extracted at BASE (`a4f6737`), 185 unique data-testids found at HEAD. 0 missing. |
| **6. Offline and remote assets**<br>Grep `src/`, `index.html` and `public/` for `http://`, `https://`, `googleapis`, `gstatic`, `cdn`, `unpkg`. App must load with no remote assets. Confirm Material Symbols served locally. | **PASS** | No external assets, CDN scripts, or Google Fonts loaded. Fonts (Inter, JetBrains Mono, Material Symbols Outlined) are bundled locally via `@fontsource` and `material-symbols`. Only `https://` matches are test mock URLs and an input placeholder in `RequestDetail.tsx`. |
| **7. No sample or filler data**<br>Grep for `lorem`, example names, hardcoded numbers or dates used as display data, and hex colours in components (colours must come from theme tokens). | **PASS** | 0 occurrences of `lorem`. 0 raw hex colours in component JSX. All components utilize `@theme` CSS design tokens. |
| **8. Logic untouched**<br>`git diff BASE..HEAD` for `src/lib/**`, `hooks`, `supabase/` must show no behaviour changes (formatting only). | **PASS** | `git diff a4f6737..HEAD -- src/lib/ src/hooks/ supabase/` is completely empty (0 files modified). |
| **9. Validation run**<br>Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; paste real output. | **PASS** | `tsc --noEmit` passed with 0 errors.<br>`eslint` passed with 0 warnings/errors.<br>4 test files (64 tests) passed.<br>Vite production build passed cleanly. |

---

## Action Plan to Fix FAIL Items

1. **Layout & Account Menu (Checks 1 & 2)**:
   - In `src/components/Layout.tsx`:
     - Remove `Profile` (`/profile/edit`) from the student navbar. Student navbar items: `Dashboard`, `Catalogue`, `Requests`, `Proposals`, `Reports`.
     - In admin navbar, change link text for `/admin` from `Admin Dashboard` to `Overview`.
     - Implement the Account Menu popover per frame 33: button triggers an account dropdown menu with:
       - `My profile` (links to `/students/${me.student?.studentid}`)
       - `Edit profile` (links to `/profile/edit`, keeping `data-testid="nav-profile-edit"`)
       - Divider
       - `Sign out` (triggers signout, keeping `data-testid="nav-signout-btn"`)
       - For admin: shows `Sign out` in account menu or navbar per frame.

2. **Forbidden Extras (Check 3)**:
   - In `src/pages/PublicProfile.tsx`:
     - Remove the avatar initials circle (`div` with `{profile.fname.charAt(0)}{profile.lname.charAt(0)}`).
     - Remove the extra "Back to catalogue" link.
   - In `src/pages/admin/AdminStudents.tsx`:
     - Remove the "Total Enrolled" meta pill.
     - Change page title from `Registered Students (Admin Oversight)` to `Students`.
   - In `src/pages/admin/AdminRequests.tsx`:
     - Change page title from `All Skill Requests (Admin Oversight)` to `Requests`.
   - In `src/pages/StudentDashboard.tsx`:
     - Remove the extraneous "Active" status pill next to the Dashboard heading.

3. **Confirmation Dialogs 41 & 42 (Check 4)**:
   - In `src/pages/RequestDetail.tsx`:
     - Add `Reject this request?` confirmation dialog (frame 41):
       - Title: `Reject this request?`
       - Description: `The requester will be notified.`
       - Buttons: `Cancel` and `Reject request` (variant="danger").
     - Add `Decline this slot?` confirmation dialog (frame 42):
       - Title: `Decline this slot?`
       - Description: `The request will be closed.`
       - Buttons: `Cancel` and `Decline slot` (variant="danger").

4. **Five Stacked Cards for Reports (Check 4)**:
   - In `src/pages/Reports.tsx`:
     - Rebuild as five stacked cards (32px vertical gap) per frames 24 & 32:
       1. Students by department (SQL code block, Department input, Apply button, result table)
       2. Skills with their category (SQL code block, result table)
       3. Feedback summary / Overall Feedback Statistics (SQL code block, result table)
       4. Requests by status (SQL code block, result table)
       5. Feedback received, highest rating first (SQL code block, result table)
     - Retain all testids (`report-dept-input`, `report-run-btn`, `report-sql-text`, `report-table`, `report-empty`, and hidden `report-select` for testid preservation).
