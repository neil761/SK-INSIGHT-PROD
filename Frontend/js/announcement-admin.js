document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".tables table tbody");
  const token = localStorage.getItem("token");
  const modal = document.getElementById("myModal");
  const btn = document.getElementById("myBtn");
  const span = document.querySelector(".close");
  const form = document.getElementById("announcementForm");

  let editingId = null; // Track whether we're editing
  let announcementsData = []; // Store all announcements globally

  // Modal open/close
  btn.onclick = () => {
    editingId = null;      // Always set to add mode
    form.reset();          // Clear previous values
    modal.style.display = "block";
  };
  span.onclick = () => modal.style.display = "none";
  window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

  // Fetch announcements
  async function fetchAnnouncements() {
    try {
      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      announcementsData = data.announcements || [];
      renderTable(announcementsData);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  // Render table rows (with pin/unpin button)
  function renderTable(data) {
    tableBody.innerHTML = "";
    // Remove any previous no-data div
    const prevNoData = document.querySelector(".no-announcements-div");
    if (prevNoData) prevNoData.remove();

    if (!data.length) {
      // Create a div below the table for "No announcements found"
      const noDataDiv = document.createElement("div");
      noDataDiv.className = "no-announcements-div";
      noDataDiv.textContent = "No announcements found.";
      noDataDiv.style.background = "#f4f6f8";
      noDataDiv.style.color = "#222";
      noDataDiv.style.fontSize = "1.08rem";
      noDataDiv.style.fontWeight = "400";
      noDataDiv.style.textAlign = "center"; // Center the text
      noDataDiv.style.padding = "18px 24px";
      noDataDiv.style.borderRadius = "8px";
      noDataDiv.style.boxShadow = "0 1px 3px rgb(0 0 0 / 0.08)";
      noDataDiv.style.marginTop = "8px";
      // Insert after the table
      document.querySelector(".tables").appendChild(noDataDiv);
      return;
    }
    data.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate || a.scheduledDateTime);
      const tr = document.createElement("tr");
      // Add a class if pinned
      if (a.isPinned) tr.classList.add("pinned-row");
      tr.innerHTML = `
        <td>${a.title}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>${a.eventDate ? new Date(a.eventDate).toLocaleString() : "-"}</td>
        <td>${status}</td>
        <td>
          <button class="btn-view" style="margin: 0 5% " data-id="${a._id}"><i class="fa-solid fa-eye" style = "color: #225aa3ff"></i></button>
          <button class="btn-edit" style="margin: 0 5% "  data-id="${a._id}"><i class="fa-solid fa-pen-to-square" style = "color: #225aa3ff"></i></button>
          <button class="btn-delete" style="margin: 0 5% "  data-id="${a._id}"><i class="fa-solid fa-trash"></i></button>
          <button class="btn-pin ${a.isPinned ? "pinned" : ""}" style="margin: 0 5%" data-id="${a._id}" xtitle="${a.isPinned ? "Unpin" : "Pin"}">
          <i class="fa-solid fa-location-pin" style="font-size:18px; color:${a.isPinned ? "#d4af37" : "#888"};"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Tab logic
const tabButtons = document.querySelectorAll(".tab-btn");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    tabButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    if (button.dataset.tab === "pending") {
      // Show all announcements
      renderTable(announcementsData);
    } else if (button.dataset.tab === "approved") {
      // ✅ Only show pinned announcements
      const pinned = announcementsData.filter(a => a.isPinned === true);
      renderTable(pinned);
    }
  });
});


  // Handle delete, view, edit, pin/unpin
  document.addEventListener("click", async (e) => {
    // DELETE
    if (e.target.closest(".btn-delete")) {
      const id = e.target.closest(".btn-delete").dataset.id;
      if (confirm("Are you sure you want to delete this announcement?")) {
        try {
          const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) fetchAnnouncements();
        } catch (err) {
          console.error("Delete error:", err);
        }
      }
    }

    // VIEW
    if (e.target.closest(".btn-view")) {
      const id = e.target.closest(".btn-view").dataset.id;
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 404) {
          alert("Announcement not found. It may have been deleted.");
          fetchAnnouncements();
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch announcement");
        const announcement = await res.json();
        const a = announcement.announcement || announcement;

        // Populate modal fields
        document.getElementById("modalTitle").textContent = a.title || "";
        document.getElementById("modalEventDate").textContent = formatDateTime(a.eventDate || a.scheduledDateTime);
        document.getElementById("modalPostedDate").textContent = formatDateTime(a.createdAt);
        document.getElementById("modalContent").textContent = a.content || "";

        document.getElementById("announcementModal").style.display = "block";
      } catch (err) {
        console.error("View error:", err);
      }
    }

    // EDIT
    if (e.target.closest(".btn-edit")) {
      const id = e.target.closest(".btn-edit").dataset.id;
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch announcement");
        const announcement = await res.json();
        const a = announcement.announcement || announcement;

        document.getElementById("title").value = a.title;
        document.getElementById("content").value = a.content;

        // Use eventDate from backend
        if (a.eventDate) {
          const dt = new Date(a.eventDate);
          document.getElementById("date").value = dt.toISOString().split("T")[0];
          document.getElementById("time").value = dt.toTimeString().slice(0,5);
        }

        editingId = id;
        modal.style.display = "block";
      } catch (err) {
        console.error("Edit error:", err);
      }
    }

    // PIN/UNPIN
    if (e.target.closest(".btn-pin")) {
      const btn = e.target.closest(".btn-pin");
      const id = btn.dataset.id;
      const isPinned = btn.classList.contains("pinned");
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}/pin`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isPinned: !isPinned })
        });
        if (res.ok) fetchAnnouncements();
        else alert("Failed to pin/unpin announcement");
      } catch (err) {
        console.error("Pin error:", err);
      }
    }
  });

  // Handle form submit (Add or Edit)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const eventDate = new Date(`${date}T${time}:00`);

    const category = "General"; 
    const expiresAt = new Date(eventDate.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days

    try {
      let url = "http://localhost:5000/api/announcements";
      let method = "POST";

      if (editingId) {
        url = `http://localhost:5000/api/announcements/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, content, eventDate, category, expiresAt })
      });

      if (res.ok) {
        modal.style.display = "none";
        form.reset();
        editingId = null;
        fetchAnnouncements();
      } else {
        alert("Failed to save announcement");
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  });

  // Helper to format date/time
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  // Close view modal
  document.getElementById("closeAnnouncementModal").onclick = function() {
    document.getElementById("announcementModal").style.display = "none";
  };
  window.onclick = function(event) {
    if (event.target == document.getElementById("announcementModal")) {
      document.getElementById("announcementModal").style.display = "none";
    }
  };

  // Check announcement status (Upcoming/Expired)
  function getAnnouncementStatus(dateString) {
    const today = new Date();
    const announcementDate = new Date(dateString);

    if (announcementDate >= today) {
        return "Upcoming";
    } else {
        return "Expired";
    }
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

  // Initial fetch
  fetchAnnouncements();
});
