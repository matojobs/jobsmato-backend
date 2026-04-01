# Admin Delete: Resources With Dependencies (Best Practice)

When a DELETE fails because of foreign key constraints (e.g. user owns companies, job has applications), the **ideal approach** is:

---

## 1. Default: Block and return 409 Conflict

- **Do not** let the database throw and surface a 500. Treat “has dependencies” as an **expected, valid state**, not a server error.
- **Return 409 Conflict** with a **clear message** explaining which dependencies block the delete (e.g. “Cannot delete job: it has 3 application(s). Remove or reassign applications first…”).
- This follows common REST/API guidance (e.g. [Stack Overflow](https://stackoverflow.com/questions/33245268/whats-the-right-http-status-code-for-a-response-when-i-cant-perform-a-delete-d)): *409 when “the request could not be completed due to a conflict with the current state of the resource” and “cascade-delete is not supported” (or not requested).*

**Implemented in this codebase:**

- **Delete user:** If the user owns any `companies`, return 409 and message. No DB delete attempted.
- **Delete job:** If the job has any `job_applications`, return 409 and message. No DB delete attempted.

---

## 2. Optional: Explicit cascade / force delete

- **Do not** cascade by default; that can remove a lot of data in one call.
- If the product needs “delete this and all dependent records”, do it as an **explicit** action:
  - e.g. query param: `DELETE /api/admin/jobs/7?cascade=true` or `?force=true`, or
  - e.g. body: `{ "cascade": true }` for DELETE (less common).
- Document that this **permanently deletes** the dependent records (e.g. all applications for that job).

**Implemented in this codebase:**

- **Delete job:** `DELETE /api/admin/jobs/:id?cascade=true` deletes all `job_applications` for that job, then the job. Without `cascade=true`, the default 409 behaviour above applies.

---

## 3. Summary

| Approach | When to use | Status code |
|----------|-------------|------------|
| **Block delete** (default) | User/job has dependencies; client should resolve or confirm | **409 Conflict** + message |
| **Cascade/force delete** | Client explicitly requests “delete this and dependents” | **200 OK** (after deleting children then parent) |
| **Never** | — | **500** for “has dependencies” (treat as client/state conflict, not server error) |

This keeps deletes safe by default and allows intentional cascade when needed.
