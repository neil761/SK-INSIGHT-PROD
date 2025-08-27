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
    const year = yearSelect.value;
    const cycle = cycleSelect.value;

    let url = "";
    if (year && cycle) {
      url = `http://localhost:5000/api/educational-assistance/filter?year=${year}&cycle=${cycle}`;
    } else {
      url = `http://localhost:5000/api/educational-assistance`;
    }

    try {
      const token = localStorage.getItem("token"); // if you need auth
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      applicants = await res.json();
      renderTables(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
    }
  }

  // ---------------- Render Tables ----------------
  function renderTables(data) {
    pendingTable.innerHTML = "";
    approvedTable.innerHTML = "";
    rejectedTable.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();

    data.forEach((app, index) => {
      const fullName = `${app.firstname} ${app.middlename} ${app.surname}`.trim();

      if (!fullName.toLowerCase().includes(searchTerm)) return;

      const row = `
        <tr>
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

  // Optional: Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
      notifDropdown.style.display = 'none';
    }
  });
});
