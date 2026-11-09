// Resend and Twilio SDKs are mocked here, so no network calls are made.
const mockResendSend = jest.fn();
const mockTwilioCreate = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockResendSend } })),
}));
jest.mock('twilio', () => jest.fn(() => ({ messages: { create: mockTwilioCreate } })));

const { createEmailProvider } = require('../src/services/notifications/emailService');
const { createSmsProvider } = require('../src/services/notifications/smsService');

const liveConfig = {
  dryRun: false,
  email: { resendApiKey: 're_test_placeholder', from: 'CheckMate <reminders@example.com>' },
  sms: { accountSid: 'ACtestplaceholder', authToken: 'placeholder', from: '+15005550006' },
};

beforeEach(() => {
  mockResendSend.mockReset();
  mockTwilioCreate.mockReset();
});

test('dry-run never creates real SDK clients', async () => {
  const email = createEmailProvider({ ...liveConfig, dryRun: true });
  const sms = createSmsProvider({ ...liveConfig, dryRun: true });
  expect(email.dryRun).toBe(true);
  expect(sms.dryRun).toBe(true);
  await email.send({ to: 'a@b.ie', subject: 'Hi', text: 'Hi' });
  expect(mockResendSend).not.toHaveBeenCalled();
});

test('missing credentials fall back to dry-run even when DRY_RUN=false', () => {
  expect(createEmailProvider({ ...liveConfig, email: { resendApiKey: '', from: '' } }).dryRun).toBe(true);
  expect(createSmsProvider({ ...liveConfig, sms: { accountSid: '', authToken: '', from: '' } }).dryRun).toBe(true);
});

test('Resend: sends with the idempotency key and returns the message id', async () => {
  mockResendSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
  const provider = createEmailProvider(liveConfig);

  const result = await provider.send({ to: 'a@b.ie', subject: 'S', text: 'T', idempotencyKey: 'key-1' });

  expect(result).toEqual({ id: 'email_123', dryRun: false });
  expect(mockResendSend).toHaveBeenCalledWith(
    { from: liveConfig.email.from, to: 'a@b.ie', subject: 'S', text: 'T' },
    { idempotencyKey: 'key-1' }
  );
});

test('Resend: an error response becomes a thrown error (so it is retried)', async () => {
  mockResendSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'Invalid from' } });
  const provider = createEmailProvider(liveConfig);
  await expect(provider.send({ to: 'a@b.ie', subject: 'S', text: 'T' })).rejects.toThrow('Resend error: Invalid from');
});

test('Twilio: sends the SMS and returns the message SID', async () => {
  mockTwilioCreate.mockResolvedValue({ sid: 'SM123' });
  const provider = createSmsProvider(liveConfig);

  const result = await provider.send({ to: '+353871234567', text: 'Hello' });

  expect(result).toEqual({ id: 'SM123', dryRun: false });
  expect(mockTwilioCreate).toHaveBeenCalledWith({ from: '+15005550006', to: '+353871234567', body: 'Hello' });
});
