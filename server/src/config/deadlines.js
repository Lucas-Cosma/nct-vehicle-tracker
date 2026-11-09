// Deadlines we track. field = Vehicle field, type = value saved on Notification records
const DEADLINES = Object.freeze([
  {
    type: 'nct',
    field: 'nctExpiry',
    label: 'NCT',
    phrase: 'NCT',
    verb: 'expires',
    pastVerb: 'expired',
    action: 'Please book your NCT as soon as possible.',
  },
  {
    type: 'motorTax',
    field: 'motorTaxExpiry',
    label: 'Motor tax',
    phrase: 'motor tax',
    verb: 'expires',
    pastVerb: 'expired',
    action: 'Please renew your motor tax as soon as possible.',
  },
  {
    type: 'insurance',
    field: 'insuranceExpiry',
    label: 'Insurance',
    phrase: 'insurance',
    verb: 'expires',
    pastVerb: 'expired',
    action: 'Please renew your insurance as soon as possible.',
  },
  {
    type: 'service',
    field: 'nextServiceDate',
    label: 'Service',
    phrase: 'next service',
    verb: 'is due',
    pastVerb: 'was due',
    action: 'Please book a service when you can.',
  },
]);

// Retest reminder after a failed NCT. Kept out of DEADLINES because its date is the day
// of the failed test, not a deadline.
const NCT_RETEST = Object.freeze({ type: 'nctRetest', field: 'nctLastTestDate', label: 'NCT retest' });

const DEADLINE_TYPES = [...DEADLINES.map((d) => d.type), NCT_RETEST.type];
const DEADLINE_FIELDS = DEADLINES.map((d) => d.field);
const DEADLINES_BY_TYPE = Object.fromEntries([...DEADLINES, NCT_RETEST].map((d) => [d.type, d]));

module.exports = { DEADLINES, NCT_RETEST, DEADLINE_TYPES, DEADLINE_FIELDS, DEADLINES_BY_TYPE };
