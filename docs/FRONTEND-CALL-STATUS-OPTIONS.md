# Call Status Options – Frontend

Use the following **Call Status** options wherever the recruiter sets or edits call outcome: **Add Candidate**, **Edit Candidate**, and **Pending Application** (call status field).

---

## Options (single source of truth)

Use these **exact** values for labels and for the value sent to the API (where supported):

| # | Option (display & value) |
|---|---------------------------|
| 1 | **Connected** |
| 2 | **RNR** |
| 3 | **Busy** |
| 4 | **Switched Off** |
| 5 | **Incoming Off** |
| 6 | **Call Back** |
| 7 | **Invalid** |
| 8 | **Wrong Number** |
| 9 | **Out of network** |

---

## Where to use

- **Add Candidate** – Call status dropdown/select when adding a new candidate (sourcing or job applications flow).
- **Edit Candidate** – Call status dropdown/select when editing an existing candidate/application.
- **Pending Applications** – Call status field when updating a pending application (e.g. “Mark call status” / “Update call outcome”).

Use the **same list** in all three places for consistency.

---

## Frontend implementation

### Constant (TypeScript)

```ts
/** Call status options for Add Candidate, Edit Candidate, and Pending Application */
export const CALL_STATUS_OPTIONS = [
  'Connected',
  'RNR',
  'Busy',
  'Switched Off',
  'Incoming Off',
  'Call Back',
  'Invalid',
  'Wrong Number',
  'Out of network',
] as const;

export type CallStatusOption = typeof CALL_STATUS_OPTIONS[number];
```

### Select / dropdown options

```ts
// For a typical select component (e.g. React)
const callStatusOptions = CALL_STATUS_OPTIONS.map((value) => ({
  value,
  label: value,
}));
```

### “Interested” only when Connected (Pending Application)

For **Pending Application** (job applications) flow:

- When the user selects **“Connected”**, show and require the **Interested** field (Yes / No or equivalent).
- When the user selects any other call status, **Interested** should be hidden or “Not applicable” (send `null`/omit).

---

## API usage

- **Job applications (Pending)**  
  - **PATCH** `/api/applications/:id/recruiter-call`  
  - Body: `{ callDate, callStatus, interested? }`  
  - Send `callStatus` as one of the options above (exact string).  
  - Backend may currently support a subset; see “Backend support” below.

- **Recruiter / Sourcing (Add / Edit candidate)**  
  - **POST** `/api/recruiter/applications` (create)  
  - **PATCH** `/api/recruiter/applications/:id` (edit)  
  - Send `call_status` (snake_case) with one of the options above.

---

## Backend support

The backend may not yet accept all 9 options. Currently supported in some flows are: **Connected**, **RNR**, **Busy**, **Wrong Number**, **Switch off** (stored as “Switch off”; frontend can show **“Switched Off”** and backend can map if needed).

New options to be supported on the backend: **Incoming Off**, **Call Back**, **Invalid**, **Out of network**, and **Switched Off** (if distinct from “Switch off”). Until the API is updated, either:

- Restrict the dropdown to the options the API accepts, or  
- Send the new options and coordinate with backend to add support and return a clear error for unsupported values.

---

## Summary

- **Options:** Connected, RNR, Busy, Switched Off, Incoming Off, Call Back, Invalid, Wrong Number, Out of network.  
- **Use in:** Add Candidate, Edit Candidate, Pending Application call status.  
- **Interested:** Required only when call status is **Connected** (Pending Application).  
- **API:** Use exact strings above for `callStatus` / `call_status`; confirm backend supports the full set before enabling all in production.
