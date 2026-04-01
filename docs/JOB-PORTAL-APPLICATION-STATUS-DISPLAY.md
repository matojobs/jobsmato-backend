# Job Portal — Application Status Display (Candidate & Employer)

This note is for the **job portal frontend** team. It describes a backend change that affects only **how application status should be shown** to candidates and employers. No new APIs, no new fields, and no change to existing flows—only the meaning and display of **status**.

---

## 1. What changed (backend)

When a **recruiter** (in the recruiter portal) marks a candidate as **Selected** or **Not Selected**, the backend now updates the application’s main **`status`** field so that:

- **Selected** → `status` is set to **`shortlisted`**
- **Not Selected** → `status` is set to **`rejected`**

So the same status that the job portal already uses is now kept in sync with the recruiter’s selection. Candidates and employers (viewing the job portal) will see the correct status without any new APIs or fields.

---

## 2. What the job portal frontend should do

**Use the existing `status` field only.**

- **Where you show application status** (e.g. “My Applications” for candidates, “Applications” for employer/job poster), keep using the **`status`** value from the API.
- **No new fields** — nothing like `selection_status` or recruiter-only fields need to be shown on the job portal.
- **No logic changes** — same endpoints, same response shape; only the **display** of `status` matters.

So: **only the display of status** should reflect that recruiter selection is now synced; no other behaviour or UI flow changes are required.

---

## 3. Status values (unchanged)

The application **`status`** continues to use the same enum values:

| Value         | Meaning (for display) |
|---------------|------------------------|
| `pending`     | Application submitted; not yet reviewed |
| `reviewing`   | Under review (e.g. recruiter has started working on it) |
| `shortlisted`| **Candidate selected** (recruiter marked as Selected) |
| `interview`  | Interview stage |
| `rejected`   | **Not selected** (recruiter marked as Not Selected) or otherwise rejected |
| `accepted`   | Accepted / offered |
| `withdrawn`  | Withdrawn by candidate |

After the backend change, when the recruiter selects or rejects the candidate, **`shortlisted`** and **`rejected`** will now appear correctly for that application on the job portal.

---

## 4. Who sees the status

- **Candidate (job seeker):** sees their own application status (e.g. in “My Applications”) — e.g. “Shortlisted”, “Rejected”, “Under review”.
- **Employer / job poster:** sees each application’s status (e.g. in the job’s application list) — same values, e.g. “Shortlisted”, “Rejected”, “Reviewing”.

Both sides use the **same `status`** from the API; only the **display** of this status is in scope. No other changes are required on the job portal frontend.
