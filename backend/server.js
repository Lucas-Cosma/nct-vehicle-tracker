const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.send("Server is running");
});
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
    if(err) { 
        console.error(err.message);
    }
    else{
        console.log('Connected to SQlite databse.');
    }
});
const users = 
 `CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL
 ); 
`;
db.run(users, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
    } else {
        console.log("users table ready");
    }
});
// registering 
app.post("/api/register", async (req, res) => {
    const {username, email, password, confirmedPassword} = req.body;

    if(!username || !email || !password || !confirmedPassword) {
        return res.status(400).json({error: "All fields are required"});
    }
    if(password !== confirmedPassword) {
        return res.status(400).json({error: "passwords do not match"});
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.run(sql, [username, email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).json({ error: "Email already registered." });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "User registered successfully!", userId: this.lastID });
        });
    } 
    catch (error) {
        res.status(500).json({ error: "Server error during registration." });
    }
});
//login route 
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Please enter email and password." });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "Invalid email or password." });

        // Compare entered password with hashed password in database
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({ message: "Login successful!", user: { id: user.id, username: user.username, email: user.email } });
        } else {
            res.status(400).json({ error: "Invalid email or password." });
        }
    });
});

// Serve the built React app in production (run `npm run build` in /frontend first)
const distPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(3000, () => {
    console.log("Listening on port 3000");
});