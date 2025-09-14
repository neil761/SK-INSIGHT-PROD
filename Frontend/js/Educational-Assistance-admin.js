if (!localStorage.getItem("token")) {
  window.location.href = "/html/admin-log.html"; // redirect to login
}



document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const yearSelect = document.getElementById("cycleNumber"); // Year dropdown
  const cycleSelect = document.getElementById("year"); // Cycle dropdown
  const searchInput = document.querySelector(".search-input");

  const pendingTable = document.querySelector("#pending tbody");
  const approvedTable = document.querySelector("#approved tbody");
  const rejectedTable = document.querySelector("#rejected tbody");

  let applicants = []; // Store fetched data
  let formCycles = []; // Store available form cycles

  // ---------------- Tabs ----------------
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });

  // ---------------- Fetch Form Cycles ----------------
  async function fetchFormCycles() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/formcycle/educ", {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      formCycles = await res.json();

      populateDropdowns(formCycles);
    } catch (error) {
      console.error("Error fetching form cycles:", error);
    }
  }

  // ---------------- Populate Dropdowns ----------------
  function populateDropdowns(cycles) {
    if (!Array.isArray(cycles)) {
      yearSelect.innerHTML = `<option value="">No cycles found</option>`;
      cycleSelect.innerHTML = `<option value="">No cycles found</option>`;
      return;
    }
    // Reset
    yearSelect.innerHTML = `<option value="">All</option>`;
    cycleSelect.innerHTML = `<option value="">All</option>`;

    // Collect unique years
    const years = [...new Set(cycles.map(c => c.year))];
    years.sort((a, b) => b - a); // sort descending

    years.forEach(year => {
      yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });

    // Populate cycle numbers (max available across years)
    const cycleNumbers = [...new Set(cycles.map(c => c.cycleNumber))];
    cycleNumbers.sort((a, b) => a - b);

    cycleNumbers.forEach(num => {
      cycleSelect.innerHTML += `<option value="${num}">Cycle ${num}</option>`;
    });
  }

  // ---------------- Fetch Applicants ----------------
  async function fetchApplicants() {
    try {
      const res = await fetch("http://localhost:5000/api/educational-assistance", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch applicants");
      const data = await res.json();
      applicants = data;
      renderTables(applicants);
    } catch (err) {
      console.error("Error fetching applicants:", err);
    }
  }

  // ---------------- Render Tables ----------------
  function renderTables(data) {
    pendingTable.innerHTML = "";
    approvedTable.innerHTML = "";
    rejectedTable.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();

    data.forEach((app, index) => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";

      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim();

      if (!fullName.toLowerCase().includes(searchTerm)) return;

      const row = `
        <tr data-id="${app._id}">
          <td>${index + 1}</td>
          <td>${fullName}</td>
          <td>${app.age}</td>
          <td>${app.schoolAddress || "N/A"}</td>
          <td>${app.sex}</td>
          <td><button class="action-btn"><i class="fas fa-eye"></i> Review</button></td>
        </tr>
      `;

      if (app.status === "pending") {
        pendingTable.innerHTML += row;
      } else if (app.status === "approved") {
        approvedTable.innerHTML += row;
      } else if (app.status === "rejected") {
        rejectedTable.innerHTML += row;
      }
    });

    // Attach modal openers after table rows are rendered
    attachModalOpeners();
  }

  // Add this after renderTables function

  function showApplicantModal(app) {
  const modal = document.getElementById("profileModal");

  const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header" style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #eee; margin-top:30px;">
        <div>
          ${app.status === "approved" ? `
            <button class="print-btn" id="printProfileBtn"><i class="fa-solid fa-print"></i> Print</button>
          ` : ""}
          <span class="close-btn" style="cursor:pointer;font-size:1.5em;margin-left:18px;">&times;</span>
        </div>
      </div>
      <div id="profileDetails">
        
        <div class="namee form-field">
          <label>Name:</label>
          <div class="form-box">${app.firstname} ${mi} ${app.surname}</div>
        </div>

        <div class="form-field row">
          <label>Birthday:</label>
          <div class="form-box">${app.birthday ? new Date(app.birthday).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : ""}</div>
          <label>Place of Birth:</label>
          <div class="form-box">${app.placeOfBirth || ""}</div>
        </div>

        <div class="form-field row">
          <label>Age:</label>
          <div class="form-box">${app.age ?? ""}</div>
          <label>Gender:</label>
          <div class="form-box">${app.sex || ""}</div>
        </div>
        
        <div class="form-field row">
          <label>Civil Status:</label>
          <div class="form-box">${app.civilStatus || ""}</div>
          <label>Religion:</label>
          <div class="form-box">${app.religion || ""}</div>
        </div>

        <div class="form-field">
          <label>Name of School:</label>
          <div class="form-box">${app.school || "-"}</div>
        </div>

        <div class="form-field">
          <label>School Address:</label>
          <div class="form-box">${app.schoolAddress || "-"}</div>
        </div>

        <div class="form-field row">
          <label>Course:</label>
          <div class="form-box">${app.course || "-"}</div>
          <label>Year Level:</label>
          <div class="form-box">${app.yearLevel || "-"}</div>
        </div>

        <div class="form-field">
        </div>

        <div class="form-field">
          <label>E-mail:</label>
          <div class="form-box">${app.user?.email || "-"}</div>
        </div>

        <div class="form-field">
          <label>Type of Benefit being Applied:</label>
          <div class="form-box">${app.typeOfBenefit || "Educational Assistance"}</div>
        </div>

        <hr>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <tr>
            <td><b>Father's Name:</b></td>
            <td>${app.fatherName || ""}</td>
            <td><b>Contact Number:</b></td>
            <td>${app.fatherPhone || ""}</td>
          </tr>
          <tr>
            <td><b>Mother's Name:</b></td>
            <td>${app.motherName || ""}</td>
            <td><b>Contact Number:</b></td>
            <td>${app.motherPhone || ""}</td>
          </tr>
        </table>
        <hr>
        <div style="margin-top:10px;">
          <b>Names of Brother/s and Sister/s</b>
          <table style="width:100%;border-collapse:collapse;margin-top:5px;">
            <thead>
              <tr style="background:#f7f7f7;">
                <th style="text-align:left;">Name</th>
                <th style="text-align:left;">Gender</th>
                <th style="text-align:left;">Age</th>
              </tr>
            </thead>
            <tbody>
              ${(app.siblings || []).map(sib => `
                <tr>
                  <td>${sib.name}</td>
                  <td>${sib.gender}</td>
                  <td>${sib.age}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <hr>
        <div style="margin-top:10px;">
          <b>Fees and other Expenses to be Incurred</b>
          <table style="width:100%;border-collapse:collapse;margin-top:5px;">
            <thead>
              <tr style="background:#f7f7f7;">
                <th style="text-align:left;">Expense</th>
                <th style="text-align:left;">Expected Cost</th>
              </tr>
            </thead>
            <tbody>
              ${(app.expenses || []).map(exp => `
                <tr>
                  <td>${exp.item}</td>
                  <td>${exp.expectedCost}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:18px; text-align:right;">
          ${app.status === "approved" ? `
            <button class="reject-btn" style="background:#e74c3c; color:#fff; border:none; border-radius:6px; padding:7px 16px; margin-right:8px; cursor:pointer;">Reject</button>
            <button class="approve-btn" style="background:#0A2C59; color:#fff; border:none; border-radius:6px; padding:7px 16px; cursor:pointer;">Approve</button>
          ` : ""}
        </div>


      </div>
    </div>
  `;

  modal.style.display = "flex";

  // Close modal
  modal.querySelector(".close-btn").onclick = () => (modal.style.display = "none");

  // Print
  if (app.status === "approved") {
    const printBtn = modal.querySelector("#printProfileBtn");
    if (printBtn) {
      printBtn.onclick = function () {
        const printContents = modal.querySelector(".modal-content").innerHTML;
        const originalContents = document.body.innerHTML;
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
      };
    }
  }
    //   modal.querySelector("#printProfileBtn").onclick = function () {
    //   const printWindow = window.open("", "_blank", "width=900,height=650");

    //   printWindow.document.write(`
    //     <html>
    //       <head>
    //         <title>Applicant Profile</title>
    //         <style>
    //           body { font-family: 'Poppins', sans-serif; margin: 40px; color: #222; }
    //           h1 { text-align: center; color: #0A2C59; }
    //           .section { margin-top: 20px; }
    //           .section b { display: inline-block; width: 180px; color: #0A2C59; }
    //           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    //           th, td { border: 1px solid #ccc; padding: 8px; font-size: 14px; }
    //           th { background: #f7f7f7; }
    //         </style>
    //       </head>
    //       <body>
    //         <h1>Applicant Profile</h1>

    //         <div class="section">
    //           <b>Name:</b> ${app.firstname} ${app.middlename || ""} ${app.surname}<br>
    //           <b>Birthday:</b> ${app.birthday ? new Date(app.birthday).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : ""}<br>
    //           <b>Place of Birth:</b> ${app.placeOfBirth || ""}<br>
    //           <b>Age:</b> ${app.age ?? ""}<br>
    //           <b>Gender:</b> ${app.sex || ""}<br>
    //           <b>Civil Status:</b> ${app.civilStatus || ""}<br>
    //           <b>Religion:</b> ${app.religion || ""}<br>
    //           <b>Email:</b> ${app.user?.email || "-"}
    //         </div>

    //         <div class="section">
    //           <b>School:</b> ${app.school || "-"}<br>
    //           <b>School Address:</b> ${app.schoolAddress || "-"}<br>
    //           <b>Course:</b> ${app.course || "-"}<br>
    //           <b>Year Level:</b> ${app.yearLevel || "-"}<br>
    //           <b>Type of Benefit:</b> ${app.typeOfBenefit || "Educational Assistance"}
    //         </div>

    //         <div class="section">
    //           <b>Father’s Name:</b> ${app.fatherName || ""} (${app.fatherPhone || ""})<br>
    //           <b>Mother’s Name:</b> ${app.motherName || ""} (${app.motherPhone || ""})
    //         </div>

    //         <div class="section">
    //           <h3>Names of Brother/s and Sister/s</h3>
    //           <table>
    //             <thead>
    //               <tr><th>Name</th><th>Gender</th><th>Age</th></tr>
    //             </thead>
    //             <tbody>
    //               ${(app.siblings || []).map(sib => `
    //                 <tr>
    //                   <td>${sib.name}</td>
    //                   <td>${sib.gender}</td>
    //                   <td>${sib.age}</td>
    //                 </tr>
    //               `).join("")}
    //             </tbody>
    //           </table>
    //         </div>

    //         <div class="section">
    //           <h3>Fees and Other Expenses</h3>
    //           <table>
    //             <thead>
    //               <tr><th>Expense</th><th>Expected Cost</th></tr>
    //             </thead>
    //             <tbody>
    //               ${(app.expenses || []).map(exp => `
    //                 <tr>
    //                   <td>${exp.item}</td>
    //                   <td>${exp.expectedCost}</td>
    //                 </tr>
    //               `).join("")}
    //             </tbody>
    //           </table>
    //         </div>
    //       </body>
    //     </html>
    //   `);

    //   printWindow.document.close();
    //   printWindow.focus();
    //   printWindow.print();
    // };
  

  // Handle approve/reject clicks
  // Approve button
const approveBtn = modal.querySelector(".approve-btn");
if (approveBtn) {
  approveBtn.onclick = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/educational-assistance/${app._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "approved" })
      });

      app.status = "approved";   
      renderTables(applicants);  
      modal.style.display = "none";
    } catch (err) {
      console.error("Error approving:", err);
      alert("Failed to approve application.");
    }
  };
}

// Reject button
const rejectBtn = modal.querySelector(".reject-btn");
if (rejectBtn) {
  rejectBtn.onclick = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/educational-assistance/${app._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: "Not eligible"
        })
      });

      app.status = "rejected";   
      renderTables(applicants);  
      modal.style.display = "none";
    } catch (err) {
      console.error("Error rejecting:", err);
      alert("Failed to reject application.");
    }
  };
}


}



  // After renderTables, attach modal openers for all .action-btn
  function attachModalOpeners() {
  document.querySelectorAll(".action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const appId = row.dataset.id;
      const app = applicants.find(a => a._id === appId);
      showApplicantModal(app);
    });
  });
}


  // ---------------- Event Listeners ----------------
  yearSelect.addEventListener("change", fetchApplicants);
  cycleSelect.addEventListener("change", fetchApplicants);
  searchInput.addEventListener("input", () => renderTables(applicants));

  // ---------------- Initial Load ----------------
  fetchFormCycles().then(fetchApplicants);

  // ---------------- Notification Dropdown Logic ----------------
  const notifBell = document.getElementById('notifBell');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifTabs = notifDropdown.querySelectorAll('.notif-tab');
  const notifListNew = document.getElementById('notifListNew');
  const notifListOverdue = document.getElementById('notifListOverdue');

  notifBell.addEventListener('click', () => {
    notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    fetchNotifications();
  });

  // Tab switching
  notifTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      notifTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      notifListNew.style.display = this.dataset.tab === 'new' ? 'block' : 'none';
      notifListOverdue.style.display = this.dataset.tab === 'overdue' ? 'block' : 'none';
    });
  });

  // Fetch notifications from backend
  async function fetchNotifications() {
    const token = localStorage.getItem("token");
    // Fetch new applications
    const newRes = await fetch('http://localhost:5000/api/notifications/unread', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newNotifs = await newRes.json();

    // Fetch overdue applications
    const overdueRes = await fetch('http://localhost:5000/api/notifications/overdue', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const overdueNotifs = await overdueRes.json();

    renderNotifList(notifListNew, newNotifs, false);
    renderNotifList(notifListOverdue, overdueNotifs, true);
  }

  function renderNotifList(container, notifs, isOverdue) {
    container.innerHTML = '';
    if (!Array.isArray(notifs) || notifs.length === 0) {
      container.innerHTML = `<div class="notif-item">No ${isOverdue ? 'Overdue' : 'New'} Applications</div>`;
      return;
    }
    notifs.forEach(n => {
      // Use flattened fullname and status from backend
      const name = n.fullname || 'unknown';
      const status = n.status || 'unknown';
      const date = new Date(n.createdAt).toLocaleString();
      container.innerHTML += `
        <div class="notif-item">
          <span><strong>${name}</strong>
            <span class="notif-status ${isOverdue ? 'notif-overdue' : ''}">${status}${isOverdue ? ' (Overdue)' : ''}</span>
          </span>
          <span class="notif-date">${date}</span>
        </div>
      `;
    });
  }

    // Helper to format date/time
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  function updateDateTime() {
    const options = { timeZone: "Asia/Manila" };
    const now = new Date(new Date().toLocaleString("en-US", options));
    const hours = now.getHours();

    let greeting = "Good evening";
    let iconClass = "fa-solid fa-moon";
    let iconColor = "#183153";
    if (hours < 12) {
      iconClass = "fa-solid fa-sun";
      iconColor = "#f7c948";
      greeting = "Good morning";
    } else if (hours < 18) {
      iconClass = "fa-solid fa-cloud-sun";
      iconColor = "#f7c948";
      greeting = "Good afternoon";
    }

    // Format date as "January 25, 2025"
    const dateStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila"
    });

    // Format time as hh:mm (24-hour)
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;

    document.getElementById("greeting").textContent = greeting;
    document.getElementById("header-date").textContent = dateStr + " -";
    document.getElementById("datetime").textContent = timeStr;

    // Update icon
    const icon = document.getElementById("greeting-icon");
    icon.className = iconClass;
    icon.style.color = iconColor;
  }

  // Initial call
  updateDateTime();
  // Update every second
  setInterval(updateDateTime, 1000);

  // Optional: Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
      notifDropdown.style.display = 'none';
    }
  });
});
