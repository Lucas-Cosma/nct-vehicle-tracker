import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import CreateAccount from "./pages/CreateAccount.jsx";
import AddCar from "./pages/AddCar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MaintenanceHistory from "./pages/MaintenanceHistory.jsx";
import Vehicles from "./pages/Vehicles.jsx";
import Dates from "./pages/Dates.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/add-car" element={<AddCar />}/>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/maintenance-history" element={<MaintenanceHistory />} />
      <Route path="/vehicles" element={<Vehicles />} />
      <Route path="/dates" element={<Dates />} />
    </Routes>
  );
}
