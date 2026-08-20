const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const JWT_SECRET = 'your-super-secret-key-change-this';

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new sqlite3.Database('./database.db', (err) => {
    if (!err) console.log("Connected to SQLite Database with Password Protection.");
});

// Setup Tables & Default Admin User
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
    db.run(`CREATE TABLE IF NOT EXISTS query_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
    db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS queries (
        ticket_no TEXT PRIMARY KEY, category TEXT, dept TEXT, query_type TEXT,
        barcode TEXT, caller_name TEXT, caller_no TEXT, client_code TEXT,
        call_action TEXT, start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time TEXT, status TEXT DEFAULT 'PENDING'
    )`);

    // Create Default Users (Admin: admin/admin123, Employee: emp/emp123)
    const adminHash = bcrypt.hashSync('admin123', 10);
    const empHash = bcrypt.hashSync('emp123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [adminHash]);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('emp', ?, 'employee')`, [empHash]);
    db.run(`INSERT OR IGNORE INTO departments (name) VALUES ('Sales'), ('Support'), ('Billing')`);
    db.run(`INSERT OR IGNORE INTO query_types (name) VALUES ('Technical Issue'), ('Billing Inquiry'), ('General')`);
});

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Access Denied. Please Login." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin Privilege Required" });
    next();
};

// --- AUTH ROUTES ---

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: "User not found" });

        const validPass = bcrypt.compareSync(password, user.password);
        if (!validPass) return res.status(400).json({ error: "Invalid Password" });

        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true, role: user.role, username: user.username });
    });
});

// Logout Route
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// Get Current User Info
app.get('/api/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// --- PROTECTED API ROUTES ---

// Add or Reset User (Admin Only)
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET password=excluded.password, role=excluded.role`,
            [username, hashedPassword, role || 'employee'], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `User ${username} saved/password updated.` });
    });
});

app.get('/api/masters', authenticateToken, (req, res) => {
    db.all(`SELECT name FROM departments`, [], (err, depts) => {
        db.all(`SELECT name FROM query_types`, [], (err, types) => {
            res.json({ departments: depts.map(d => d.name), types: types.map(t => t.name) });
        });
    });
});

app.post('/api/departments', authenticateToken, requireAdmin, (req, res) => {
    db.run(`INSERT INTO departments (name) VALUES (?)`, [req.body.name], (err) => {
        if (err) return res.status(400).json({ error: "Already exists" });
        res.json({ success: true });
    });
});

app.post('/api/query-types', authenticateToken, requireAdmin, (req, res) => {
    db.run(`INSERT INTO query_types (name) VALUES (?)`, [req.body.name], (err) => {
        if (err) return res.status(400).json({ error: "Already exists" });
        res.json({ success: true });
    });
});

app.post('/api/queries', authenticateToken, (req, res) => {
    const data = req.body;
    const ticketNo = 'TICK-' + Math.floor(100000 + Math.random() * 900000);

    const query = `INSERT INTO queries (ticket_no, category, dept, query_type, barcode, caller_name, caller_no, client_code, call_action, end_time, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`;
    
    db.run(query, [ticketNo, data.category, data.dept, data.queryType, data.barcode, data.callerName, data.callerNo, data.clientCode, data.callAction, data.endTime], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ticketNo });
    });
});

app.get('/api/queries', authenticateToken, (req, res) => {
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const sql = `SELECT * FROM queries WHERE ticket_no LIKE ? OR caller_name LIKE ? OR barcode LIKE ? OR client_code LIKE ? ORDER BY start_time DESC`;
    db.all(sql, [search, search, search, search], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/queries/:ticketNo', authenticateToken, (req, res) => {
    db.run(`UPDATE queries SET status = ? WHERE ticket_no = ?`, [req.body.status, req.params.ticketNo], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/export-and-cleanup', authenticateToken, requireAdmin, (req, res) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const dateStr = oneMonthAgo.toISOString().slice(0, 19).replace('T', ' ');

    db.all(`SELECT * FROM queries WHERE start_time <= ?`, [dateStr], (err, rows) => {
        if (err || rows.length === 0) return res.json({ message: "No records older than 30 days to export." });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Archive_Queries");
        
        const fileName = `Export_Archive_${Date.now()}.xlsx`;
        XLSX.writeFile(workbook, path.join(__dirname, fileName));

        db.run(`DELETE FROM queries WHERE start_time <= ?`, [dateStr], function() {
            res.json({ message: `Exported and deleted ${this.changes} records older than 30 days.` });
        });
    });
});

app.listen(3000, () => console.log('Password Protected Server running on http://localhost:3000'));