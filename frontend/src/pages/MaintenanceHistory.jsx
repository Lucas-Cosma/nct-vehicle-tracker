import {useState} from "react"
import "../styles/maintenancehistory.css";
import logo from '../assets/logo.png';

const storageKey = 'checkmate-maintenance-demo-v1';

function MaintenanceHistory() {
  // Browser storage is for the Sprint 1 demo, until accounts and cars are connected.
  const [savedData] = useState(() => {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(records) || records.some(record =>
        !record || typeof record.id !== 'string' ||
        typeof record.registration !== 'string' || typeof record.service !== 'string' ||
        typeof record.date !== 'string' || typeof record.notes !== 'string'
      )) {
        throw new Error('Invalid saved records');
      }
      return { records, error: '' };
    } catch {
      return { records: [], error: 'Saved records could not be loaded. Saving is disabled to protect existing data.' };
    }
  });
  const [records, setRecords] = useState(savedData.records);
  const [registration, setRegistration] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(savedData.error);
  const [filter, setFilter] = useState('');

  // Use today's local date, so the date limit is correct near midnight.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const visibleRecords = records
    .filter(record => record.registration.includes(filter.trim().toUpperCase()))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  function addRecord(event) {
    event.preventDefault();
    setMessage('');
    if (savedData.error) return;
    if (!registration.trim() || !service.trim() || !date || date > today) {
      setError('Enter a registration, service or part, and a date that is not in the future.');
      return;
    }

    const newRecord = {
      id: crypto.randomUUID(),
      registration: registration.trim().toUpperCase(),
      service: service.trim(),
      date,
      notes: notes.trim(),
    };
    const updatedRecords = [...records, newRecord];
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    } catch {
      setError('The record could not be saved in this browser. Your entries have been kept so you can try again.');
      return;
    }
    setRecords(updatedRecords);
    setService('');
    setDate('');
    setNotes('');
    setFilter('');
    setError('');
    setMessage('Maintenance record saved.');
  }

  return (
    <div className="maintenance-page">
      <main>
      <div className="heading">
        <img src={logo} alt="CheckMate logo" width="100" height="80" />
        <h1>Maintenance History</h1>
      </div>
      {/* <p className="maintenance-demo">Sprint 1 demo: records are saved only in this browser, not to your account. Use sample data on shared devices.</p> */}

      <form className="card maintenance-card" onSubmit={addRecord}>
        <h2>Add a maintenance record</h2>
        <label className="form-header">Car registration *
          <input required maxLength={20} value={registration} onChange={event => setRegistration(event.target.value)} placeholder="e.g. 201-D-12345" />
        </label>
        <label className="form-header">Service or part *
          <input required maxLength={100} value={service} onChange={event => setService(event.target.value)} placeholder="e.g. Brake pads replaced" />
        </label>
        <label className="form-header">Date completed *
          <input required type="date" max={today} value={date} onChange={event => setDate(event.target.value)} />
        </label>
        <label className="form-header">Notes (optional)
          <textarea maxLength={1000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Front brake pads replaced during service" />
        </label>
        {error && <p role="alert" className="maintenance-error">{error}</p>}
        <p role="status" className="maintenance-status">{message}</p>
        <button type="submit" disabled={Boolean(savedData.error)}>Save record</button>
      </form>

      <section className="card maintenance-card" aria-labelledby="maintenance-history-title">
        <h2 id="maintenance-history-title">Previous maintenance</h2>
        <label className="form-header">Filter by car registration
          <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Enter a registration" />
        </label>
        <p>{visibleRecords.length} record{visibleRecords.length === 1 ? '' : 's'} — newest first</p>
        {records.length === 0 ? <p>No maintenance records yet. Add your first record above.</p> :
          visibleRecords.length === 0 ? <p>No records match this registration.</p> :
          <ul className="maintenance-list">
            {visibleRecords.map(record => (
              <li key={record.id}>
                <h3>{record.service}</h3>
                <p><strong>Car:</strong> {record.registration}</p>
                <p><strong>Date:</strong> <time dateTime={record.date}>{record.date.split('-').reverse().join('/')}</time></p>
                <p className="maintenance-notes"><strong>Notes:</strong> {record.notes || 'No notes added.'}</p>
              </li>
            ))}
          </ul>
        }
      </section>
    </main>
    </div>
  );
}

export default MaintenanceHistory;
