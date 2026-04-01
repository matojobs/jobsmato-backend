# Postman

Postman collections and environments for testing the Jobsmato API.

## Files

| File | Description |
|------|-------------|
| `Admin-Panel-API.postman_collection.json` | Admin panel endpoints. |
| `Jobsmato-Applications-API.postman_collection.json` | Applications API. |
| `Jobsmato-API.postman_environment.json` | Environment variables (base URL, tokens). |

## Usage

1. Import the collection(s) and the environment into Postman.
2. Select the **Jobsmato-API** environment.
3. For admin endpoints: log in via the Admin Login request; the token is saved to the environment.
4. Run requests as needed.

Update the environment’s `base_url` (and any other variables) to match your backend (e.g. `http://localhost:5000/api`).
