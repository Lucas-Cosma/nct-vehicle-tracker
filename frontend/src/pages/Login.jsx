import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import banner from "../assets/banner.png";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null); // { type, text }
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "CheckMate";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
    setMessage({ type: "success", text: `Welcome back, ${data.user.username}!` });
    navigate("/dashboard");
    } catch {
      setMessage({ type: "error", text: "Could not reach the server." });
    }
  }

  return (
    <main>
      <div className="login-page-container">
        <div className="card-info">
          <h1>Checkmate</h1>

          <div className="card-image">
            <img src={logo} width="120" height="100" alt="Logo" />
          </div>

          <p>Never miss a tax date, insurance renewal or fail your NCT again!</p>
          <p> -NCT, Tax and Insurance Alerts</p>
          <p> -Local Mechanic Price Compare</p>
        </div>

        <div className="card-login">
          <h2>Welcome back!</h2>
          <p>Sign into your account</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && <p className={`message ${message.type}`}>{message.text}</p>}
            <button type="submit" className="btn-primary">Log In</button>
          </form>

          <Link className="link" to="/create-account">
            {" "}Don't have an account? Register now
          </Link>
        </div>
      </div>

      <img src={banner} width="1650" height="340" alt="" />
    </main>
  );
}
