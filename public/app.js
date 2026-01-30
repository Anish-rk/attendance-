// ===== CONFIG (UNCHANGED) =====
const classroomLocation = { lat: 11.059006, lng: 76.948314 };
const maxDistanceMeters = 10; // strict match (~same location)

const timetable = [
  { period: "1", subject: "Artificial intelligence" },
  { period: "2", subject: "Cloud" },
  { period: "3", subject: "Machine learning" },
  { period: "4", subject: "Artificial intelligence-LAB" },
  { period: "5", subject: "Database management system" },
];

// ===== DOM =====
const loginSection = document.getElementById("loginSection");
const timetableSection = document.getElementById("timetableSection");
const studentIdInput = document.getElementById("studentIdInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const timetableBody = document.getElementById("timetableBody");
const logoutBtn = document.getElementById("logoutBtn");

let attendanceChart = null;

// ===== DISTANCE CALCULATION =====
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== LOAD TIMETABLE =====
function loadTimetable() {
  timetableBody.innerHTML = "";
  timetable.forEach(({ period, subject }, index) => {
    timetableBody.innerHTML += `
      <tr>
        <td>${period}</td>
        <td>${subject}</td>
        <td>
          <button class="attendance-btn btn btn-success btn-sm" data-index="${index}">
            Mark Attendance
          </button>
          <button class="request-btn btn btn-warning btn-sm" data-index="${index}">
            Request
          </button>
        </td>
      </tr>`;
  });
}

// ===== LOAD ATTENDANCE CHART =====
async function loadAttendanceChart() {
  try {
    const response = await fetch("/api/attendance");
    const data = await response.json();

    // Get unique student IDs who marked attendance
    const uniqueStudentIds = new Set(data.map((record) => record.studentId));

    const totalStudents = 60;
    const attendedCount = uniqueStudentIds.size;
    const notAttendedCount = totalStudents - attendedCount;

    const ctx = document.getElementById("attendanceChart")?.getContext("2d");
    if (!ctx) return;

    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Attended", "Not Attended"],
        datasets: [
          {
            data: [attendedCount, notAttendedCount],
            backgroundColor: ["#ffc107", "#6c757d"], // yellow and grey
            hoverOffset: 20,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          title: {
            display: false,
          },
        },
      },
    });
  } catch (err) {
    console.error("Error loading attendance chart:", err);
  }
}

// ===== LOGIN =====
loginBtn.addEventListener("click", () => {
  const studentId = studentIdInput.value.trim();
  const password = passwordInput.value.trim();

  const studentIdError = document.getElementById("studentIdError");
  const passwordError = document.getElementById("passwordError");

  studentIdError.textContent = "";
  passwordError.textContent = "";
  studentIdInput.classList.remove("error");
  passwordInput.classList.remove("error");

  const idPattern = /^231da0(0[1-9]|[1-5][0-9]|60)$/;
  let valid = true;

  if (!idPattern.test(studentId)) {
    studentIdError.textContent = "Invalid Student ID (231da001 – 231da060)";
    studentIdInput.classList.add("error");
    valid = false;
  }

  if (password !== "kasc@123") {
    passwordError.textContent = "Wrong password";
    passwordInput.classList.add("error");
    valid = false;
  }

  if (!valid) return;

  sessionStorage.setItem("studentId", studentId);
  loginSection.style.display = "none";
  timetableSection.style.display = "block";
  loadTimetable();
  loadAttendanceChart();
});

// ===== LOGOUT =====
logoutBtn.addEventListener("click", () => {
  sessionStorage.clear();
  timetableSection.style.display = "none";
  loginSection.style.display = "flex";
  studentIdInput.value = "";
  passwordInput.value = "";
});

// ===== BUTTON EVENTS =====
timetableBody.addEventListener("click", async (e) => {
  const index = e.target.dataset.index;

  // ===== ATTENDANCE =====
  if (e.target.classList.contains("attendance-btn")) {
    try {
      // Check attendance status before marking
      const statusResp = await fetch("/api/attendance/status");
      if (!statusResp.ok) throw new Error("Failed to get attendance status");
      const statusData = await statusResp.json();

      if (statusData.status !== "started") {
        alert(
          "Attendance is not active now. Please wait for the teacher to start attendance."
        );
        return;
      }

      // Proceed to get geolocation
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        )
      );

      const dist = getDistanceFromLatLonInMeters(
        pos.coords.latitude,
        pos.coords.longitude,
        classroomLocation.lat,
        classroomLocation.lng
      );

      if (dist > maxDistanceMeters) {
        alert("Location not matched. Please request attendance.");
        return;
      }

      await fetch("/api/attendance/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sessionStorage.getItem("studentId"),
          subject: timetable[index].subject,
          date: new Date().toLocaleDateString(),
          status: "Present",
        }),
      });

      alert("Attendance marked successfully");
      loadAttendanceChart(); // Refresh chart after attendance
    } catch (err) {
      alert(
        "Location access failed.\n\n" +
          "✔ Enable GPS\n" +
          "✔ Allow browser location permission\n" +
          "✔ Use mobile device for accuracy"
      );
    }
  }

  // ===== REQUEST =====
  if (e.target.classList.contains("request-btn")) {
    location.href = `request.html?subject=${encodeURIComponent(
      timetable[index].subject
    )}`;
  }
});

// ===== AUTO LOGIN =====
window.onload = () => {
  if (sessionStorage.getItem("studentId")) {
    loginSection.style.display = "none";
    timetableSection.style.display = "block";
    loadTimetable();
    loadAttendanceChart();
  }
};
