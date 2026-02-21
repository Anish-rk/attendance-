const express = require("express");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

let attendance = [];
let requests = [];

// 🔥 Global Attendance Status
let attendanceActive = false;

// 🔥 SIMPLE EMAIL SETUP (YOUR EMAIL ADDED)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "231da008@kongunaducollege.ac.in",
    pass: "habggcgrkqvokhws"
  }
});

// ===============================
// SAVE ATTENDANCE
// ===============================
app.post("/api/attendance/add", (req, res) => {
  const { studentId, subject, date, status } = req.body;

  if (!attendanceActive) {
    return res.status(400).json({ error: "Attendance is not active" });
  }

  if (!studentId || !subject || !date || !status) {
    return res.status(400).json({ error: "Missing data" });
  }

  const exists = attendance.find(a =>
    a.studentId === studentId &&
    a.subject === subject &&
    a.date === date
  );

  if (exists) {
    return res.status(400).json({ error: "Already marked" });
  }

  attendance.push({ studentId, subject, date, status });
  res.json({ ok: true });
});

// ===============================
app.get("/api/attendance", (req, res) => {
  res.json(attendance);
});

// ===============================
// REQUEST
// ===============================
app.post("/api/request", (req, res) => {
  const { studentId, subject, date, reason } = req.body;

  if (!studentId || !subject || !date) {
    return res.status(400).json({ error: "Missing data" });
  }

  requests.push({
    studentId,
    subject,
    reason,
    date,
    id: Date.now(),
    status: "Pending"
  });

  res.json({ ok: true });
});

// ===============================
app.get("/api/requests", (req, res) => {
  res.json(requests);
});

// ===============================
// APPROVE REQUEST
// ===============================
app.post("/api/approve", (req, res) => {
  const { id } = req.body;

  const r = requests.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: "Request not found" });

  r.status = "Approved";

  attendance.push({
    studentId: r.studentId,
    subject: r.subject,
    date: r.date,
    status: "Approved"
  });

  res.json({ ok: true });
});

// ===============================
// SET ATTENDANCE STATUS + SEND MAIL
// ===============================
app.post("/api/attendance/status", async (req, res) => {

  const { status } = req.body;
  attendanceActive = status === "started";

  // 🔥 SEND MAIL WHEN STARTED
  if (attendanceActive) {

    const mailOptions = {
      from: "231da008@kongunaducollege.ac.in",
      to: "231da016@kongunaducollege.ac.in, 231da005@kongunaducollege.ac.in, 231da040@kongunaducollege.ac.in",
      subject: "Attendance Started",
      text: "Attendance has started. Please login and mark your attendance."
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Mail sent successfully");
    } catch (err) {
      console.log("Mail sending error:", err);
    }
  }

  res.json({ ok: true });
});

// ===============================
app.get("/api/attendance/status", (req, res) => {
  res.json({ active: attendanceActive });
});

// ===============================
// EXPORT TO EXCEL
// ===============================
app.get("/api/export", async (req, res) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance");

  if (attendance.length === 0) {
    worksheet.addRow(["No attendance data available"]);
  } else {

    const subjects = [...new Set(attendance.map(a => a.subject))];

    worksheet.columns = [
      { header: "Student ID", key: "studentId", width: 20 },
      { header: "Date", key: "date", width: 15 },
      ...subjects.map(subject => ({
        header: subject,
        key: subject,
        width: 25
      }))
    ];

    const grouped = {};

    attendance.forEach(a => {
      const key = `${a.studentId}_${a.date}`;

      if (!grouped[key]) {
        grouped[key] = {
          studentId: a.studentId,
          date: a.date
        };
      }

      grouped[key][a.subject] = a.status;
    });

    Object.values(grouped).forEach(row => {
      worksheet.addRow(row);
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=attendance.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});

// ===============================
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});