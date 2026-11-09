// Test settings, loaded before every test file
process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key-0123456789';
process.env.REMINDER_DAYS_BEFORE = '30,14,7,1,0';
process.env.OVERDUE_ALERTS = 'true';
process.env.OVERDUE_REPEAT_DAYS = '7';
process.env.NCT_RETEST_REMINDERS = 'true';
process.env.NCT_RETEST_REPEAT_DAYS = '7';
process.env.NCT_RETEST_WINDOW_DAYS = '30';
process.env.CRON_ENABLED = 'false';
process.env.DRY_RUN = 'true';
process.env.MAX_DELIVERY_ATTEMPTS = '3';
process.env.RETRY_BASE_MINUTES = '15';

// make sure real credentials can't leak into tests
delete process.env.ALLOW_REAL_NOTIFICATIONS_IN_TESTS;
delete process.env.RESEND_API_KEY;
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.MONGODB_URI;
