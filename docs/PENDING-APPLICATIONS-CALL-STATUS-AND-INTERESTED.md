# Pending Applications: Call Status and Interested

This document describes how **Call Status** and **Interested** work on the Pending Applications flow (recruiter portal), and where **phone numbers** are taken from in the API response.

---

## 1. Where phone numbers come from

Pending application data is loaded from:

- **List:** `GET /api/applications/pending` (recruiter token)
- **Single (modal):** `GET /api/applications/:id` or from the list item

The response includes a `user` object and optionally `user.profile`. Phone numbers can appear in two places:

| Source | Field | Description |
|--------|--------|-------------|
| **Account** | `user.phone` | Main contact phone from the user account (e.g. job portal registration). |
| **Profile** | `user.profile.phone` | Phone stored in the candidate's profile (can differ from account). |

**UI behaviour:**

- Both numbers are shown when present:
  - **Phone (account):** `user.phone`
  - **Phone (profile):** `user.profile.phone`
- If only one exists, only that one is shown.
- If both exist and are the same, both lines are still shown with a note that it's the same number.
- If neither exists, we show "No phone number in response".

No other fields are used for the displayed "phone" (e.g. we do not use `user.id` or any numeric ID as a phone).

---

## 2. Call Status options

The **Call Status** dropdown has exactly these options (value and label match):

| Value (sent) | Stored in DB | Label |
|--------------|--------------|--------|
| `Busy` | Busy | Busy |
| `RNR` | RNR | RNR |
| `Connected` | Connected | Connected |
| `Wrong Number` | Wrong Number | Wrong Number |
| `Switch off` | Switch off | Switch off |

- Both **`PATCH /api/applications/:id/recruiter-call`** and **`PATCH /api/recruiter/applications/:id`** accept these values.
- These are sent in the request body as `callStatus` (applications API) or `call_status` (recruiter API); both map to the same DB field.

---

## 3. Interested: when it's required and when it's optional

**Rule:** We can only know candidate interest when the **call is connected**. So:

- **Call Status = "Connected"**  
  - **Interested** is **required**.  
  - Recruiter must choose **Yes** or **No**.  
  - We send a boolean `interested: true | false`.

- **Call Status = anything else** (Busy, RNR, Wrong Number, Switch off)  
  - **Interested** is **optional**.  
  - Default option is **"Not applicable (call not connected)"**.  
  - Recruiter can still choose Yes/No if they know it.  
  - If they leave it as "Not applicable", we send **`interested: null`** in the API.

So:

- **Interested** is only mandatory when **Call Status** is **"Connected"**.
- For all other call statuses, **Interested** is optional and can be sent as `null`.

---

## 4. API summary

**Endpoint:** `PATCH /api/applications/:id/recruiter-call`

**Body:**

- `callDate`: string (e.g. `YYYY-MM-DD`)
- `callStatus`: string (one of the six options above)
- `interested`: `true` | `false` | `null`  
  - `true` / `false` when call was connected and we know interest.  
  - `null` when call was not connected (or "Not applicable" in the UI).

---

## 5. Summary table

| Call Status           | Interested required? | Value sent for Interested |
|-----------------------|----------------------|----------------------------|
| Connected             | Yes                  | `true` or `false`          |
| Call not connected    | No                   | `null` (or Yes/No if set)  |
| Switch off            | No                   | `null` (or Yes/No if set)  |
| RNR                   | No                   | `null` (or Yes/No if set)  |
| Busy                  | No                   | `null` (or Yes/No if set)  |
| Call back             | No                   | `null` (or Yes/No if set)  |

---

## 6. Data source for the modal

All data shown in the Recruiter call details modal (including both phone numbers and "Show more" details) comes from the same application object:

- Either the item already loaded in the **pending list** (`GET /api/applications/pending`), or  
- A fresh load via **`GET /api/applications/:id`** when the modal opens.

There is no separate "phone" or "candidate" API; everything is part of the application response (`user`, `user.profile`, `job`, etc.).
