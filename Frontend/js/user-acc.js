document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".tables table tbody");
  const token = localStorage.getItem("token");
  const searchInput = document.getElementById("userSearch"); // <-- Add this line

  let allUsers = []; // Store all users for filtering

  // Fetch all users
  async function fetchUsers() {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const users = await res.json();
      allUsers = users.filter(u => u.role !== "admin"); // Store non-admins
      renderTable(allUsers);
    } catch (err) {
      console.error("Error:", err);
      tableBody.innerHTML = `<tr><td colspan="4">Error loading users</td></tr>`;
    }
  }

  // Render table rows
  function renderTable(data) {
    tableBody.innerHTML = "";

    // Update user account counter
    const counter = document.getElementById("userAccCount");
    if (counter) counter.textContent = data.length;

    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="4">No users found</td></tr>`;
      return;
    }

    data.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      const filtered = allUsers.filter(u =>
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
      );
      renderTable(filtered);
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

  // Initial load
  fetchUsers();
});
