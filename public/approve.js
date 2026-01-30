document.addEventListener("DOMContentLoaded", loadRequests);

function teacherLogout() {
  sessionStorage.clear();
  location.href = "teacher.html";
}

async function loadRequests() {
  const box = document.getElementById("requestsList");
  box.innerHTML = "<p class='text-center'>Loading...</p>";

  try {
    const res = await fetch("/api/requests");
    const data = await res.json();

    if (!data.length) {
      box.innerHTML = "<p class='text-center mt-3'>No pending requests</p>";
      return;
    }

    let html = `
      <table class="table table-bordered text-center">
        <thead class="table-warning">
          <tr>
            <th>Student ID</th>
            <th>Subject</th>
            <th>Reason</th>
            <th>Status / Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td>${r.studentId}</td>
          <td>${r.subject}</td>
          <td>${r.reason}</td>
          <td>
            ${
              r.status === "Pending"
                ? `<button class="btn btn-success btn-sm" onclick="approve(${r.id})">Approve</button>`
                : r.status
            }
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    box.innerHTML = html;

  } catch (e) {
    box.innerHTML = "<p class='text-danger text-center'>Failed to load</p>";
  }
}

async function approve(id) {
  await fetch("/api/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  alert("Approved successfully");
  loadRequests();
}
