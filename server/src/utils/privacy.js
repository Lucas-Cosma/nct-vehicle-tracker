// Hides most of an email/phone in logs, e.g. c*****@example.com, +35*******567
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(Math.max(name.length - 1, 1))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

function maskRecipient(recipient) {
  return String(recipient || '').includes('@') ? maskEmail(recipient) : maskPhone(recipient);
}

module.exports = { maskEmail, maskPhone, maskRecipient };
