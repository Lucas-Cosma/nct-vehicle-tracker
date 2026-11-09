# Notification Test Cases

Cezary - Notifications for upcoming, due-today and overdue deadlines

## Setup used for every test

- "Today" is **1 November 2026** (Irish time) unless the test says otherwise.
- Reminders are sent **30, 14, 7 and 1 days before** a deadline, and **on the day** (`REMINDER_DAYS_BEFORE=30,14,7,1,0`).
- Overdue alerts are on and repeat **once a week** (`OVERDUE_ALERTS=true`, `OVERDUE_REPEAT_DAYS=7`).
- The test car is **191-D-12345**. The user has email notifications on unless the test says otherwise.
- No real messages are sent. The tests use fake email/SMS providers.

Each test case has a matching automated test in `tests/reminderService.test.js` with the same ID
(e.g. `TC04 deadline 7 days away`). Run them with `npm test`.

## Upcoming deadlines

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| TC01 | Deadline too far away | NCT expires 2 Dec 2026 (31 days) | No notification |
| TC02 | 30 days before | NCT expires 1 Dec 2026 | Email: "CheckMate reminder: NCT for 191-D-12345 expires in 30 days" |
| TC03 | Car added late (10 days left) | NCT expires 11 Nov 2026 | One email, "expires in 10 days" (14-day reminder). The missed 30-day reminder is not sent. |
| TC04 | 7 days before | NCT expires 8 Nov 2026 | Email: "...expires in 7 days" |
| TC05 | 1 day before | NCT expires 2 Nov 2026 | Email: "...expires tomorrow" |
| TC06 | Check runs twice in one day | NCT expires 8 Nov 2026, check run at 10:00 and 11:00 | Only one email |
| TC07 | Next day, same reminder window | NCT expires 8 Nov 2026, check run on 1 Nov and 2 Nov | Only one email (the 7-day one) |

## Due today

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| TC08 | NCT expires today | NCT expires 1 Nov 2026 | Email: "CheckMate reminder: NCT for 191-D-12345 expires today" |
| TC09 | Service due today | Next service 1 Nov 2026 | Email: "CheckMate reminder: Service for 191-D-12345 is due today" |
| TC10 | Reminder the day before and on the day | NCT expires 2 Nov 2026, check run on 1 Nov and 2 Nov | Two emails: "expires tomorrow", then "expires today" |

## Overdue deadlines

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| TC11 | Expired yesterday | NCT expired 31 Oct 2026 | Email: "CheckMate overdue: NCT for 191-D-12345 expired yesterday", including "Please book your NCT as soon as possible." |
| TC12 | Expired 3 days ago | Insurance expired 29 Oct 2026 | One email: "CheckMate overdue: Insurance for 191-D-12345 expired 3 days ago" |
| TC13 | Still overdue later the same week | NCT expired 29 Oct 2026, check run on 1, 4 and 5 Nov | Only one overdue email |
| TC14 | Still overdue a week later | NCT expired 29 Oct 2026, check run on 1 Nov and 6 Nov | Two overdue emails: "3 days ago", then "8 days ago" |
| TC15 | User renews after an overdue alert | NCT expired 29 Oct 2026, then changed to 29 Oct 2027 | No more overdue alerts. A normal 30-day reminder is sent on 29 Sep 2027. |
| TC16 | Overdue alerts turned off | `OVERDUE_ALERTS=false`, NCT expired 29 Oct 2026 | No notification |
| TC17 | Overdue alert only once | `OVERDUE_REPEAT_DAYS=0`, NCT expired 29 Oct 2026, check run on 1, 6 and 30 Nov | Only one overdue email |

## Failed NCT

Settings: `NCT_RETEST_REMINDERS=true`, `NCT_RETEST_REPEAT_DAYS=7`, `NCT_RETEST_WINDOW_DAYS=30`.
The car's last NCT is saved with a test date and a result (passed/failed).

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| TC28 | NCT failed today | Last test 1 Nov 2026, failed | Email straight away: "CheckMate: 191-D-12345 failed its NCT - book your retest", with "Book your retest by 1 Dec 2026 (30 days left)." |
| TC29 | Still not retested a week later | Last test 29 Oct 2026, failed, check run on 1, 4 and 5 Nov | Two emails: one on 1 Nov, one on 5 Nov ("by 28 Nov 2026 (23 days left)"), nothing on 4 Nov |
| TC30 | Car passes the retest | Failed 29 Oct, then marked passed | No more retest reminders |
| TC31 | Failed NCT and NCT expiring soon | Failed 29 Oct, NCT expires 8 Nov | Only the retest reminder, not the normal "NCT expires in 7 days" one |
| TC32 | Retest period over | Last test 20 Sep 2026, failed | "The 30-day retest period ended on 20 Oct 2026. Please book a new NCT test." |
| TC33 | Fails the retest too | Failed 29 Oct, then failed again on 3 Nov | Reminders start over: "Book your retest by 3 Dec 2026 (30 days left)." |
| TC34 | Retest reminders turned off | `NCT_RETEST_REMINDERS=false`, failed 29 Oct, NCT expires 8 Nov | Normal reminder: "NCT for 191-D-12345 expires in 7 days" |

## Notification preferences

All with NCT expiring 8 Nov 2026 (7 days).

| ID | Scenario | User settings | Expected result |
|---|---|---|---|
| TC18 | Email only | Email on, SMS off | One email, no SMS |
| TC19 | SMS only | Email off, SMS on, phone +353871234567 | One SMS: "CheckMate: NCT for 191-D-12345 expires in 7 days (8 Nov 2026)." No email |
| TC20 | Email and SMS | Both on | One email and one SMS |
| TC21 | SMS on but no phone number | Both on, no phone saved | Email sent, SMS skipped (counted as "skipped - missing contact") |
| TC22 | Everything off | Both off | Nothing sent |

## Delivery

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| TC23 | Sending fails once | Email provider fails on the first try | Marked "failed", retried 15 minutes later, then "sent" (2 attempts). User gets one email. |
| TC24 | Sending keeps failing | Email provider always fails | Tried 3 times (15 and 30 minutes apart), then stops. Status stays "failed". |
| TC25 | Due-today reminder never got through | NCT expires 1 Nov, every attempt that day fails | Next day the due-today reminder is cancelled and the overdue alert ("expired yesterday") is sent instead |
| TC26 | Two checks running at the same time | 3 users, 2 deadlines each, 5 checks started at once | Every notification is sent exactly once (8 in total) |
| TC27 | Irish time, not UTC | Check runs at 23:30 UTC on 31 Jul 2026, NCT expires 1 Aug 2026 | Treated as 1 August (00:30 in Dublin): "expires today" |
