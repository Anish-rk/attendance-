const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let attendance = [];
let requests = [];

// save attendance
app.post("/api/attendance/add", (req, res) => {
  attendance.push(req.body);
  res.json({ ok: true });
});

// get attendance
app.get("/api/attendance", (req, res) => {
  res.json(attendance);
});

// send request
app.post("/api/request", (req, res) => {
  requests.push({ ...req.body, id: Date.now(), status: "Pending" });
  res.json({ ok: true });
});

// get requests
app.get("/api/requests", (req, res) => {
  res.json(requests);
});

// approve request
app.post("/api/approve", (req, res) => {
  const r = requests.find(x => x.id === req.body.id);
  if (!r) return res.sendStatus(404);

  r.status = "Approved";
  attendance.push({
    studentId: r.studentId,
    subject: r.subject,
    date: r.date,
    status: "Approved Request"
  });

  res.json({ ok: true });
});

app.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
