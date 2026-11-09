import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import banner from "../assets/banner.png";

export default function CreateAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmedPassword: "",
  });
  const [message, setMessage] = useState(null); // { type, text }

  useEffect(() => {
    document.title = "CheckMate - Create Account";
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      setMessage({ type: "success", text: "Account created! Redirecting to login..." });
      setTimeout(() => navigate("/"), 1200);
    } catch {
      setMessage({ type: "error", text: "Could not reach the server." });
    }
  }

  return (
    <main>
      <div className="createAccountCard">
        <h2>Create Account</h2>
        <p>Sign up to track your NCT, tax, and insurance.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input type="text" id="reg-username" name="username" placeholder="Choose a username"
              value={form.username} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input type="email" id="reg-email" name="email" placeholder="Enter your email"
              value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input type="password" id="reg-password" name="password" placeholder="Create a password"
              value={form.password} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input type="password" id="reg-confirm" name="confirmedPassword" placeholder="Confirm your password"
              value={form.confirmedPassword} onChange={handleChange} />
          </div>
          {message && <p className={`message ${message.type}`}>{message.text}</p>}
          <button type="submit" className="btn-primary2">Register</button>
        </form>

        <p>Already have an account? <Link className="link" to="/">Log in</Link></p>
      </div>

      <img src={banner} width="1650" height="340" alt="" />
    </main>
  );
}
