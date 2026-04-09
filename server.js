import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || "jamup-secret-key-2024-rwanda";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const verificationCodes = new Map();

const ALLOWED_ADMIN_EMAILS = [
  "jabojulesmaurice@gmail.com",
  "gasnamoses01@gmail.com",
  "uwingabireange2003@gmail.com",
  "uwajenezaernestine2002@gmail.com",
  "kayitareprecious057@gmail.com",
];

const db = new Database("jamup.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    customer_email TEXT,
    device_type TEXT NOT NULL,
    issue TEXT NOT NULL,
    location TEXT,
    preferred_hour TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS page_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Track page visits
app.post("/api/track-visit", (req, res) => {
  const { path: visitPath } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "";
  db.prepare("INSERT INTO page_visits (path, ip, user_agent) VALUES (?, ?, ?)").run(visitPath || "/", ip, ua);
  res.json({ ok: true });
});

// Submit booking
app.post("/api/book-repair", async (req, res) => {
  const { name, phone, deviceType, issue, customerEmail, location, preferredHour } = req.body;
  if (!name || !phone || !deviceType || !issue) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  const stmt = db.prepare(`
    INSERT INTO bookings (name, phone, customer_email, device_type, issue, location, preferred_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, phone, customerEmail || null, deviceType, issue, location || null, preferredHour || null);

  if (customerEmail) {
    try {
      await transporter.sendMail({
        from: `"JAMUP Eletrônica HUB" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: "✅ Repair Booking Confirmed – JAMUP",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:16px;padding:40px;border:1px solid #27272a;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="background:#2563eb;border-radius:12px;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">⚡</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:700;">Booking Confirmed!</h1>
              <p style="color:#a1a1aa;margin-top:8px;font-size:15px;">Thank you for choosing JAMUP Eletrônica HUB</p>
            </div>

            <p style="color:#d4d4d8;font-size:15px;margin-bottom:24px;">Hi <strong style="color:#fff;">${name}</strong>, we've received your repair request and our team will be in touch with you shortly.</p>

            <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:24px;margin-bottom:24px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">Booking Details</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#71717a;font-size:14px;width:40%;">Booking ID</td><td style="padding:6px 0;color:#fff;font-size:14px;font-weight:600;">#${result.lastInsertRowid}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Device</td><td style="padding:6px 0;color:#fff;font-size:14px;">${deviceType}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Issue</td><td style="padding:6px 0;color:#fff;font-size:14px;">${issue}</td></tr>
                ${location ? `<tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Location</td><td style="padding:6px 0;color:#fff;font-size:14px;">${location}</td></tr>` : ""}
                ${preferredHour ? `<tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Preferred Time</td><td style="padding:6px 0;color:#fff;font-size:14px;">${preferredHour}</td></tr>` : ""}
                <tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Phone</td><td style="padding:6px 0;color:#fff;font-size:14px;">${phone}</td></tr>
              </table>
            </div>

            <div style="background:#1c2a3a;border:1px solid #1e40af;border-radius:12px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;color:#93c5fd;font-size:13px;">📍 <strong>JAMUP Eletrônica HUB LTD</strong> — Musanze, Rwanda<br/>Our team will contact you on <strong>${phone}</strong> to confirm your appointment.</p>
            </div>

            <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Booking confirmation email failed:", emailErr.message);
    }
  }

  res.json({ ok: true, id: result.lastInsertRowid });
});

// Get bookings for user portal (public)
app.get("/api/bookings", (req, res) => {
  const bookings = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all();
  res.json({ bookings });
});

// ADMIN: Check if email is allowed
app.post("/api/admin/check-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const normalized = email.toLowerCase().trim();
  const allowed = ALLOWED_ADMIN_EMAILS.includes(normalized);
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(normalized);
  res.json({ allowed, registered: !!existing });
});

// ADMIN: Send verification code to email
app.post("/api/admin/send-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const normalized = email.toLowerCase().trim();
  if (!ALLOWED_ADMIN_EMAILS.includes(normalized)) {
    return res.status(403).json({ error: "Your email is not authorized." });
  }
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(normalized);
  if (existing) {
    return res.status(409).json({ error: "This email is already registered." });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(normalized, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  try {
    await transporter.sendMail({
      from: `"JAMUP Admin System" <${process.env.SMTP_USER}>`,
      to: normalized,
      subject: "Your JAMUP Admin Verification Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:16px;padding:40px;border:1px solid #27272a;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="background:#2563eb;border-radius:12px;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <span style="font-size:28px;">⚡</span>
            </div>
            <h1 style="margin:0;font-size:24px;font-weight:700;">JAMUP Admin</h1>
          </div>
          <p style="color:#a1a1aa;margin-bottom:8px;">Your verification code is:</p>
          <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2563eb;">${code}</span>
          </div>
          <p style="color:#71717a;font-size:13px;text-align:center;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: "Failed to send verification email. Check SMTP configuration." });
  }
});

// ADMIN: Verify code
app.post("/api/admin/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code required." });
  const normalized = email.toLowerCase().trim();
  const entry = verificationCodes.get(normalized);
  if (!entry) return res.status(400).json({ error: "No verification code found. Please request a new one." });
  if (Date.now() > entry.expiresAt) {
    verificationCodes.delete(normalized);
    return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
  }
  if (entry.code !== code.trim()) {
    return res.status(400).json({ error: "Incorrect verification code." });
  }
  verificationCodes.delete(normalized);
  res.json({ ok: true, verified: true });
});

// ADMIN: Register
app.post("/api/admin/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required." });
  }
  const normalized = email.toLowerCase().trim();
  if (!ALLOWED_ADMIN_EMAILS.includes(normalized)) {
    return res.status(403).json({ error: "Your email is not authorized as an admin. Contact the JAMUP team." });
  }
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(normalized);
  if (existing) {
    return res.status(409).json({ error: "This email is already registered as an admin." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)").run(name, normalized, hash);
  const token = jwt.sign({ email: normalized, name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ ok: true, token, name, email: normalized });
});

// ADMIN: Login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  const normalized = email.toLowerCase().trim();
  if (!ALLOWED_ADMIN_EMAILS.includes(normalized)) {
    return res.status(403).json({ error: "You do not have access. This system is for authorized JAMUP admins only." });
  }
  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(normalized);
  if (!admin) return res.status(404).json({ error: "No admin account found for this email. Please register first." });
  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: "Incorrect password." });
  const token = jwt.sign({ email: normalized, name: admin.name, id: admin.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ ok: true, token, name: admin.name, email: normalized });
});

// ADMIN: Dashboard data
app.get("/api/admin/clients", authMiddleware, (req, res) => {
  const bookings = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all();
  const admins = db.prepare("SELECT id, name, email, registered_at FROM admins ORDER BY registered_at DESC").all();
  res.json({ bookings, admins });
});

// ADMIN: Update booking status
app.patch("/api/admin/bookings/:id/status", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["pending", "in_progress", "completed", "cancelled", "denied"];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });
  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
  res.json({ ok: true });
});

// ADMIN: Analytics
app.get("/api/admin/analytics", authMiddleware, (req, res) => {
  const totalBookings = db.prepare("SELECT COUNT(*) as count FROM bookings").get().count;
  const totalVisits = db.prepare("SELECT COUNT(*) as count FROM page_visits").get().count;
  const todayVisits = db.prepare("SELECT COUNT(*) as count FROM page_visits WHERE date(visited_at) = date('now')").get().count;
  const bookingsByStatus = db.prepare("SELECT status, COUNT(*) as count FROM bookings GROUP BY status").all();
  const bookingsByDevice = db.prepare("SELECT device_type, COUNT(*) as count FROM bookings GROUP BY device_type ORDER BY count DESC").all();
  const bookingsByLocation = db.prepare("SELECT location, COUNT(*) as count FROM bookings WHERE location IS NOT NULL AND location != '' GROUP BY location ORDER BY count DESC LIMIT 10").all();
  const bookingsPerDay = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM bookings
    WHERE created_at >= date('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `).all();
  const visitsPerDay = db.prepare(`
    SELECT date(visited_at) as day, COUNT(*) as count
    FROM page_visits
    WHERE visited_at >= date('now', '-30 days')
    GROUP BY date(visited_at)
    ORDER BY day ASC
  `).all();
  const totalClients = db.prepare("SELECT COUNT(DISTINCT phone) as count FROM bookings").get().count;
  const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM admins").get().count;

  res.json({
    totalBookings,
    totalVisits,
    todayVisits,
    totalClients,
    totalAdmins,
    bookingsByStatus,
    bookingsByDevice,
    bookingsByLocation,
    bookingsPerDay,
    visitsPerDay,
  });
});

// Serve built frontend in production
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JAMUP server running on http://localhost:${PORT}`);
});
