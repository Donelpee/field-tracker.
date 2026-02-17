# UAT Checklist (Client Sign-off)

Use this checklist during client acceptance testing. Mark each scenario as PASS/FAIL and capture notes.

## Test Setup

- [ ] Test with at least 1 Admin user and 2 Staff users
- [ ] Ensure location permission is enabled on staff test device/browser
- [ ] Ensure Supabase tables/realtime/storage are configured

---

## 1) Authentication & Access

- [ ] Admin can sign in successfully
- [ ] Staff can sign in successfully
- [ ] Invalid credentials are rejected with clear message
- [ ] Staff device lock behavior is enforced as expected
- [ ] Sign out returns user to auth screen

Notes:

---

## 2) Role-based Navigation

- [ ] Admin sees dashboard modules (jobs/staff/attendance/photos/settings/reports)
- [ ] Staff sees staff-specific modules only
- [ ] Restricted modules are hidden/inaccessible for unauthorized roles

Notes:

---

## 3) Job Lifecycle

- [ ] Admin creates a new job
- [ ] Admin edits a job (status, assignment, schedule)
- [ ] Admin assigns/reassigns staff
- [ ] Assigned staff sees job in personal dashboard
- [ ] Job filters and search return expected results

Notes:

---

## 4) Attendance

- [ ] Staff can check in with location captured
- [ ] Staff can check out with total hours calculated
- [ ] Attendance record appears in admin report
- [ ] Attendance filters by date range and staff are accurate
- [ ] CSV export contains expected rows/columns

Notes:

---

## 5) Location Tracking

- [ ] Staff location status updates without UI lockups
- [ ] Admin location history map loads selected user path
- [ ] Timeline entries display coordinates/address and timestamps
- [ ] Retry flow works when location permission is denied then enabled

Notes:

---

## 6) Photos & Evidence

- [ ] Staff can upload/take photo for job
- [ ] Uploaded photo appears in job photo gallery
- [ ] Admin photos view shows uploaded evidence
- [ ] Before/After tags and urgent flags display correctly

Notes:

---

## 7) Notifications

- [ ] Staff receives job assignment notification
- [ ] Admin receives staff check-in/check-out notifications
- [ ] Notification bell unread count is accurate
- [ ] Mark-as-read/delete actions sync with notifications page

Notes:

---

## 8) Analytics & Performance

- [ ] Performance leaderboard loads with expected staff metrics
- [ ] Job insights charts render without errors
- [ ] Date range selectors update chart/table values correctly

Notes:

---

## 9) Non-Functional Checks

- [ ] App loads and navigates smoothly on target devices
- [ ] No console-breaking errors during critical flows
- [ ] Build deployed environment uses correct Supabase env values

Notes:

---

## Sign-off

- Client Representative: ____________________
- Date: ____________________
- Overall Result: [ ] PASS  [ ] PASS WITH CONDITIONS  [ ] FAIL
- Final Remarks:

---

## Next Step

After completing this checklist, record the go/no-go decision and approvals in [REMEDIATION_CLOSEOUT.md](./REMEDIATION_CLOSEOUT.md).
