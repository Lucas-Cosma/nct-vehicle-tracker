CheckMate Backend – Notifications
This is the notifications part of the CheckMate backend. It checks car dates for the NCT, motor tax, insurance and servicing. It can send email and text reminders before a date is due, on the day, and after it has passed.

If an NCT fails, it also reminds the user to book a retest. The reminders stop when the NCT is marked as passed.

The backend uses Node.js, Express, MongoDB and scheduled daily checks. Tests use Jest.

Adding and editing cars is being built separately by Lukas. For now, you can use the sample car described below to try the notifications.