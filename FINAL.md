# Final Verification Checklist

- [x] Item 1: Save migration 0012 in the repo
- [x] Item 2: Email payload compatibility
- [x] Item 3: Adapter calls the email function
- [x] Item 4: Remove leftover extras and verify route links
- [x] Item 5: Verify confirmation dialogs and reports page
- [ ] Item 6: Full verification (typecheck, lint, test, build, audit)
- [ ] Item 7: Docs update
- [ ] Item 8: Final report

---

## Route Link Verification List (Item 4)

Every `Link`, `NavLink`, `<a href>`, and `navigate()` / `<Navigate>` target in `src/` resolved against routes in `App.tsx`:

### Link Targets in `src/`
- `src/components/Layout.tsx:103`: `<Link to={me?.role === 'admin' ? '/admin' : '/dashboard'}>` -> `/admin` or `/dashboard`
- `src/components/Layout.tsx:121`: `<Link to="/dashboard">` -> `/dashboard`
- `src/components/Layout.tsx:126`: `<Link to="/catalogue">` -> `/catalogue`
- `src/components/Layout.tsx:131`: `<Link to="/requests">` -> `/requests`
- `src/components/Layout.tsx:136`: `<Link to="/proposals">` -> `/proposals`
- `src/components/Layout.tsx:141`: `<Link to="/reports">` -> `/reports`
- `src/components/Layout.tsx:151`: `<Link to="/admin">` -> `/admin`
- `src/components/Layout.tsx:156`: `<Link to="/admin/categories">` -> `/admin/categories`
- `src/components/Layout.tsx:161`: `<Link to="/admin/skills">` -> `/admin/skills`
- `src/components/Layout.tsx:166`: `<Link to="/admin/requests">` -> `/admin/requests`
- `src/components/Layout.tsx:171`: `<Link to="/admin/students">` -> `/admin/students`
- `src/components/Layout.tsx:176`: `<Link to="/reports">` -> `/reports`
- `src/components/Layout.tsx:230`: `<Link to="/students/${me.student?.studentid}">` -> `/students/:studentid`
- `src/components/Layout.tsx:239`: `<Link to="/profile/edit">` -> `/profile/edit`
- `src/components/ui/PageHeader.tsx:24`: `<Link to={backTo}>` (Dynamic prop, defined by callers; none active)
- `src/pages/Login.tsx:58`: `<Link to="/login">` -> `/login`
- `src/pages/Login.tsx:135`: `<Link to="/signup">` -> `/signup`
- `src/pages/Login.tsx:140`: `<Link to="/admin/login">` -> `/admin/login`
- `src/pages/Login.tsx:144`: `<Link to="/admin/signup">` -> `/admin/signup`
- `src/pages/StudentSignup.tsx:73`: `<Link to="/login">` -> `/login`
- `src/pages/StudentSignup.tsx:87`: `<Link to="/login">` -> `/login`
- `src/pages/StudentSignup.tsx:99`: `<Link to="/login">` -> `/login`
- `src/pages/StudentSignup.tsx:178`: `<Link to="/login">` -> `/login`
- `src/pages/AdminLogin.tsx:46`: `<Link to="/login">` -> `/login`
- `src/pages/AdminLogin.tsx:103`: `<Link to="/admin/signup">` -> `/admin/signup`
- `src/pages/AdminLogin.tsx:107`: `<Link to="/login">` -> `/login`
- `src/pages/AdminSignup.tsx:74`: `<Link to="/login">` -> `/login`
- `src/pages/AdminSignup.tsx:170`: `<Link to="/admin/login">` -> `/admin/login`
- `src/pages/AdminSignup.tsx:174`: `<Link to="/login">` -> `/login`
- `src/pages/StudentDashboard.tsx:57`: `<Link to="/catalogue">` -> `/catalogue`
- `src/pages/StudentDashboard.tsx:76`: `<Link to="/catalogue">` -> `/catalogue`
- `src/pages/StudentDashboard.tsx:91`: `<Link to="/requests">` -> `/requests`
- `src/pages/StudentDashboard.tsx:163`: `<Link to="/requests/${u.requestid}">` -> `/requests/:requestid`
- `src/pages/StudentDashboard.tsx:217`: `<Link to="/requests/${f.requestid}">` -> `/requests/:requestid`
- `src/pages/PublicProfile.tsx:61`: `<Link to="/catalogue">` -> `/catalogue`
- `src/pages/PublicProfile.tsx:149`: `<Link to="/skills/${s.skillid}">` -> `/skills/:skillid`
- `src/pages/Catalogue.tsx:58`: `<Link to="/proposals">` -> `/proposals`
- `src/pages/Catalogue.tsx:230`: `<Link to="/skills/${s.skillid}">` -> `/skills/:skillid`
- `src/pages/Catalogue.tsx:246`: `<Link to="/skills/${s.skillid}">` -> `/skills/:skillid`
- `src/pages/SkillDetail.tsx:59`: `<Link to="/catalogue">` -> `/catalogue`
- `src/pages/SkillDetail.tsx:137`: `<Link to="/students/${p.studentid}">` -> `/students/:studentid`
- `src/pages/RequestsList.tsx:137`: `<Link to="/requests/${r.requestid}">` -> `/requests/:requestid`
- `src/pages/RequestsList.tsx:159`: `<Link to="/requests/${r.requestid}">` -> `/requests/:requestid`
- `src/pages/RequestDetail.tsx:236`: `<Link to="/requests">` -> `/requests`
- `src/pages/RequestDetail.tsx:280`: `<Link to="/students/${request.counterpart_studentid}">` -> `/students/:studentid`
- `src/pages/admin/AdminDashboard.tsx:52`: `<Link to="/admin/categories">` -> `/admin/categories`
- `src/pages/admin/AdminDashboard.tsx:63`: `<Link to="/reports">` -> `/reports`
- `src/pages/admin/AdminDashboard.tsx:82`: `<Link to="/admin/students">` -> `/admin/students`
- `src/pages/admin/AdminDashboard.tsx:95`: `<Link to="/admin/categories">` -> `/admin/categories`
- `src/pages/admin/AdminDashboard.tsx:107`: `<Link to="/admin/skills">` -> `/admin/skills`
- `src/pages/admin/AdminDashboard.tsx:133`: `<Link to="/admin/requests">` -> `/admin/requests`
- `src/pages/admin/AdminDashboard.tsx:173`: `<Link to="/admin/categories">` -> `/admin/categories`
- `src/pages/admin/AdminDashboard.tsx:185`: `<Link to="/admin/skills">` -> `/admin/skills`
- `src/pages/admin/AdminDashboard.tsx:197`: `<Link to="/admin/requests">` -> `/admin/requests`
- `src/pages/admin/AdminDashboard.tsx:209`: `<Link to="/admin/students">` -> `/admin/students`
- `src/pages/admin/AdminDashboard.tsx:221`: `<Link to="/reports">` -> `/reports`

### NavLink Targets in `src/`
- None used.

### `<a href>` Targets in `src/`
- None used.

### `navigate()` Invocations in `src/`
- `src/pages/StudentSignup.tsx:51`: `navigate('/profile/setup')` -> `/profile/setup`
- `src/pages/SkillDetail.tsx:36`: `navigate('/requests/${newRequestId}')` -> `/requests/:requestid`
- `src/pages/Login.tsx:34`: `navigate('/profile/setup')` -> `/profile/setup`
- `src/pages/Login.tsx:36`: `navigate('/dashboard')` -> `/dashboard`
- `src/pages/AdminSignup.tsx:53`: `navigate('/admin')` -> `/admin`
- `src/pages/AdminLogin.tsx:25`: `navigate('/admin')` -> `/admin`
- `src/hooks/useProfileSetup.ts:129`: `navigate('/dashboard')` -> `/dashboard`
- `src/components/Layout.tsx:55`: `navigate('/login')` -> `/login`

### `<Navigate />` Redirect Targets in `src/`
- `src/components/Guards.tsx:14`: `<Navigate to="/admin" replace />` -> `/admin`
- `src/components/Guards.tsx:16`: `<Navigate to="/dashboard" replace />` -> `/dashboard`
- `src/components/Guards.tsx:31`: `<Navigate to="/login" replace state={{ from: location }} />` -> `/login`
- `src/components/Guards.tsx:35`: `<Navigate to="/admin" replace />` -> `/admin`
- `src/components/Guards.tsx:41`: `<Navigate to="/profile/setup" replace />` -> `/profile/setup`
- `src/components/Guards.tsx:56`: `<Navigate to="/admin/login" replace state={{ from: location }} />` -> `/admin/login`
- `src/components/Guards.tsx:60`: `<Navigate to="/dashboard" replace />` -> `/dashboard`
- `src/components/Guards.tsx:75`: `<Navigate to="/login" replace state={{ from: location }} />` -> `/login`
- `src/App.tsx:217`: `<Navigate to="/login" replace />` -> `/login`
