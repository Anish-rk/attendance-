// ===============================
// CONFIG
// ===============================
const timetable = [
  { period: "1", subject: "Artificial intelligence" },
  { period: "2", subject: "Cloud" },
  { period: "3", subject: "Machine learning" },
  { period: "4", subject: "Artificial intelligence-LAB" },
  { period: "5", subject: "Database management system" },
];

// ===============================
// DOM
// ===============================
const loginSection = document.getElementById("loginSection");
const timetableSection = document.getElementById("timetableSection");
const studentIdInput = document.getElementById("studentIdInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const timetableBody = document.getElementById("timetableBody");
const logoutBtn = document.getElementById("logoutBtn");
const video = document.getElementById("video");

// ===============================
// LOAD FACE MODELS
// ===============================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
}
loadModels();

// ===============================
function loadTimetable() {
  timetableBody.innerHTML = "";
  timetable.forEach(({ period, subject }, index) => {
    timetableBody.innerHTML += `
      <tr>
        <td>${period}</td>
        <td>${subject}</td>
        <td>
          <button class="attendance-btn btn btn-warning btn-sm me-2" data-index="${index}">
            Mark Attendance
          </button>

          <button class="request-btn btn btn-secondary btn-sm" data-index="${index}">
            Request
          </button>
        </td>
      </tr>`;
  });
}

// ===============================
async function verifyFace(studentId) {

  video.style.display = "block";
  let stream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await video.play();
    await new Promise(r => setTimeout(r, 2000));

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) throw new Error("No face detected");

    const img = await faceapi.fetchImage(`/known_faces/${studentId}.jpg`);

    const reference = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!reference) throw new Error("Reference image not found");

    const distance = faceapi.euclideanDistance(
      detection.descriptor,
      reference.descriptor
    );

    return distance < 0.5;

  } catch (err) {
    alert(err.message);
    return false;
  } finally {
    if (stream) stream.getTracks().forEach(t => t.stop());
    video.style.display = "none";
  }
}

// ===============================
loginBtn.addEventListener("click", () => {
  const studentId = studentIdInput.value.trim();
  const password = passwordInput.value.trim();

  const idPattern = /^231da0(0[1-9]|[1-5][0-9]|60)$/;

  if (!idPattern.test(studentId) || password !== "kasc@123") {
    alert("Invalid login");
    return;
  }

  sessionStorage.setItem("studentId", studentId);
  loginSection.style.display = "none";
  timetableSection.style.display = "block";
  loadTimetable();
});

// ===============================
logoutBtn.addEventListener("click", () => {
  sessionStorage.clear();
  timetableSection.style.display = "none";
  loginSection.style.display = "flex";
});

// ===============================
timetableBody.addEventListener("click", async (e) => {

  // REQUEST
  if (e.target.classList.contains("request-btn")) {
    const index = e.target.dataset.index;
    const subject = timetable[index].subject;
    window.location.href =
      `request.html?subject=${encodeURIComponent(subject)}`;
    return;
  }

  if (!e.target.classList.contains("attendance-btn")) return;

  const index = e.target.dataset.index;
  const studentId = sessionStorage.getItem("studentId");

  e.target.disabled = true;
  e.target.innerText = "Checking...";

  // 🔥 CHECK ATTENDANCE STATUS FROM SERVER
  const statusRes = await fetch("/api/attendance/status");
  const statusData = await statusRes.json();

  if (!statusData.active) {
    alert("Attendance is not active ❌");
    e.target.disabled = false;
    e.target.innerText = "Mark Attendance";
    return;
  }

  e.target.innerText = "Verifying...";

  const matched = await verifyFace(studentId);

  if (!matched) {
    alert("Face not matched ❌");
    e.target.disabled = false;
    e.target.innerText = "Mark Attendance";
    return;
  }

  const res = await fetch("/api/attendance/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      subject: timetable[index].subject,
      date: new Date().toLocaleDateString(),
      status: "Present"
    })
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    e.target.disabled = false;
    e.target.innerText = "Mark Attendance";
    return;
  }

  alert("Attendance marked successfully ✅");
  e.target.innerText = "Marked";
});

// ===============================
window.onload = () => {
  if (sessionStorage.getItem("studentId")) {
    loginSection.style.display = "none";
    timetableSection.style.display = "block";
    loadTimetable();
  }
};