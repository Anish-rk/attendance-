const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Endpoint to receive attendance POST requests
app.post("/", async (req, res) => {
  const { studentId, period, timestamp, lat, lng } = req.body;

  if (!studentId || !period || !timestamp || !lat || !lng) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Save attendance record in Firestore under collection "attendance"
    await db.collection("attendance").add({
      studentId,
      period,
      timestamp: new Date(timestamp),
      location: new admin.firestore.GeoPoint(lat, lng),
    });

    return res.json({ success: true, message: "Attendance recorded" });
  } catch (error) {
    console.error("Error saving attendance:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.attendance = functions.https.onRequest(app);
