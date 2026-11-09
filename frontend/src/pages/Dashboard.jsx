
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/Dashboard.css";

function Dashboard() {
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(0);

  const car = cars[selectedCar];

  const deadlines = car?.deadlines || [];
  const reminders = car?.reminders || [];

  return (
<div className="dashboard-page">
          <header>
        <div className="logo">
          <img src={logo} alt="CheckMate Logo" />
          <h1 className="name">CheckMate</h1>
        </div>

        <nav className="navbar">
          <ul className="nav-links">
            <li><Link to="/" className="active">Home</Link></li>
            <li><Link to="/vehicles">Vehicles</Link></li>
            <li><Link to="/dates">Dates</Link></li>
            <li><Link to="/maintenance-history">Maintenance History</Link></li>
            <li><Link to="/add-car">Add New Car</Link></li>
          </ul>
        </nav>

        <Link to="/" className="profile" title="Profile">
          &#128100;
        </Link>
      </header>

      <main className="Home">
        <section className="leftside">
          <div className="car-image">
            {car?.image ? (
              <img src={car.image} alt="Selected Car" />
            ) : (
              <p>{car ? "No car image available" : "No vehicle selected yet"}</p>
            )}
          </div>

          <div className="tabs">
            {cars.map((vehicle, index) => (
              <button
                key={vehicle.reg}
                className={`tab ${selectedCar === index ? "active" : ""}`}
                onClick={() => setSelectedCar(index)}
              >
                {vehicle.reg}
              </button>
            ))}
          </div>

          <fieldset>
            <legend>Car Information</legend>
            <p><span>Make:</span> <b>{car?.make || "No vehicle added"}</b></p>
            <p><span>Model:</span> <b>{car?.model || "-"}</b></p>
            <p><span>Reg No:</span> <b>{car?.reg || "-"}</b></p>
            <p><span>Year:</span> <b>{car?.year || "-"}</b></p>
          </fieldset>

          <p>
          </p>
        </section>

        <section className="rightside">
          <h2 className="box-title">Upcoming / Overdue deadlines</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr className="head">
                  <th>Task</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {deadlines.length === 0 ? (
                  <tr>
                    <td colSpan="3">You're all up to date!</td>
                  </tr>
                ) : (
                  deadlines.map((deadline, index) => (
                    <tr
                      key={index}
                      className={deadline.status === "Overdue" ? "overdue" : ""}
                    >
                      <td>{deadline.task}</td>
                      <td>{deadline.status}</td>
                      <td>{deadline.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2>Reminders</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr className="head">
                  <th>Task</th>
                  <th>Last Date</th>
                  <th>Next Date</th>
                </tr>
              </thead>

              <tbody>
                {reminders.length === 0 ? (
                  <tr>
                    <td colSpan="3">No reminders available.</td>
                  </tr>
                ) : (
                  reminders.map((reminder, index) => (
                    <tr key={index}>
                      <td>{reminder.task}</td>
                      <td>{reminder.lastDate}</td>
                      <td>{reminder.nextDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
