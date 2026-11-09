# Mohamed — Sprint 1 maintenance history

Adds a simple React screen for recording a service or replaced part and viewing previous maintenance. It uses the existing React/Vite setup, plain CSS, logo, red buttons and dark cards. No dependencies were changed.

## Run

Use Node.js 22.12+ (tested with Node 24).

```sh
cd client
npm ci
npm run dev
```

Open the local address printed by Vite, then choose **Maintenance History** in the navigation.

## Files

- `client/src/components/MaintenanceHistory.jsx`: form, validation, browser storage, filtering and history list.
- `client/src/components/MaintenanceHistory.css`: scoped styles and navigation styles.
- `client/src/App.jsx`: imports the component and adds two navigation buttons; the existing add-car form remains.

## How it works

React `useState` stores the form fields and record list. Submitting the form checks required fields and rejects future dates. A record contains `id`, `registration`, `service`, `date` (YYYY-MM-DD), and `notes`. Registration is trimmed and uppercased. Records are saved to localStorage before the success message appears. The list sorts by newest date and can be filtered by registration. Blank notes are allowed. Failed saves preserve the input; unreadable stored data is not overwritten.

## Scope and integration

This is a working frontend prototype for Sprint 1, not account-backed storage. Records are local to the browser/origin and visible to other people using the same browser profile. Use sample data for demos. Clearing browser data removes the records. There are no edit/delete actions in this sprint.

The component does not yet read cars from Lukas's backend or identify Natalia's signed-in user. Once those interfaces are agreed, replace the registration field with the selected car, use its stable vehicle ID and replace localStorage with authenticated API calls that check ownership. Do not treat the registration filter as access control. The reminders backend is separate and currently uses MongoDB; this feature does not introduce Firebase or change its schema.

Branch base: `feature/add-car-frontend`, commit `1b225a234b5d205439463c2fe512896cbaff5766`. When integrating, merge the add-car frontend first or account for its included commits; Mohamed's changes are the four files listed here (including this guide).

## Verification

- `npm ci`: passed using the existing lockfile.
- `npm run build`: passed.
- `npm run lint`: passed.
- React DOM checks in a temporary jsdom harness: passed for empty state, required and whitespace-only fields, future-date rejection, successful add, field reset, displayed date/notes, optional notes, newest-first ordering, case-insensitive filtering, remount persistence, navigation back to the original add-car screen, storage quota failure, and corrupt stored-data protection.
- These DOM checks do not verify browser layout or integration with a live account/database.

Manual demo: add a brake-pad record, add a later oil-change record, check the newer record appears first, filter by registration, and refresh. Try an empty service and a future date: neither should save. Check the screen at mobile width before the team demo.
