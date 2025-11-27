// 🔹 Redirect to login if no token or token expired
(function() {
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "./admin-log.html";
    });
  }
  if (!token) {
    sessionExpired();
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      sessionStorage.removeItem("token");
      sessionExpired();
    }
  } catch (e) {
    sessionStorage.removeItem("token");
    sessionExpired();
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // dynamic API base for deploy vs local development
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

  const tableBody = document.querySelector(".tables table tbody");
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage
  const modal = document.getElementById("myModal");
  const addBtn = document.getElementById("myBtn");
  const closeBtn = document.querySelector(".close");
  const form = document.getElementById("announcementForm");

  let editingId = null; // Track whether we're editing
  let announcementsData = []; // Store all announcements globally

  // Show modal
  function showModal() {
    modal.style.display = "flex";
    // Force a reflow to ensure the modal is rendered before adding the show class
    modal.offsetHeight;
    modal.classList.add("show");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  // Hide modal
  function hideModal() {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      document.body.style.overflow = ""; // Re-enable scrolling
    }, 300);
    form.reset(); // Reset form when closing
    editingId = null; // Reset editing state
    
    // Reset modal header
    const modalHeader = document.querySelector('.modal-header h2');
    if (modalHeader) {
      modalHeader.textContent = 'Add Announcement';
    }
  }

  // Modal triggers
  addBtn.onclick = showModal;
  closeBtn.onclick = hideModal;

  // Close on outside click
  window.onclick = (event) => {
    if (event.target === modal) {
      hideModal();
    }
    // Close time picker when clicking outside
    if (!event.target.closest('input[type="time"]') && !event.target.closest('.time-picker')) {
      const activeTimeInput = document.activeElement;
      if (activeTimeInput && activeTimeInput.type === 'time') {
        activeTimeInput.blur();
      }
    }
  };

  // Handle time input: only close picker if user chooses AM/PM or clicks outside
  const timeInput = document.getElementById("time");

  // Helper: detect if time picker is open (not always possible, but we can use focus/blur)
  // Close time picker if user clicks outside
  document.addEventListener("mousedown", function(e) {
    if (document.activeElement === timeInput && !e.target.closest('input[type="time"]')) {
      timeInput.blur();
    }
  });

  // For most browsers, the time input is 24-hour and doesn't have AM/PM, but on some (esp. mobile),
  // the picker may have AM/PM. We can listen for change and check if the value changed from previous.
  let lastTimeValue = timeInput.value;
  timeInput.addEventListener("change", function() {
    // Only close if the value actually changed (user picked a time, possibly with AM/PM)
    if (this.value !== lastTimeValue) {
      lastTimeValue = this.value;
      setTimeout(() => {
        this.blur();
      }, 50);
    }
  });

  // Fetch announcements
  async function fetchAnnouncements() {
    try {
      const res = await fetch(`${API_BASE}/api/announcements`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      // Use data.announcements from backend
      announcementsData = Array.isArray(data.announcements) ? data.announcements : [];
      // Do NOT call renderTable here!
      // Only call renderCurrentTab after fetching
    } catch (err) {
      console.error("Error:", err);
      tableBody.innerHTML = "";
    }
  }

  // Render table rows (with pin/unpin button, or only view for expired)
  function renderTable(data) {
    tableBody.innerHTML = "";
    if (!data.length) return;
    const tab = getCurrentTab && getCurrentTab();
    data.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate || a.scheduledDateTime);
      const tr = document.createElement("tr");
      if (a.isPinned) tr.classList.add("pinned-row");
      let actionsHtml = "";
      if (tab === "expired") {
        // Only show view button for expired announcements
        actionsHtml = `
          <button class="btn-view" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-eye" style="color: #225aa3ff"></i>
          </button>
        `;
      } else {
        // Add view button to All and Pinned tabs
        actionsHtml = `
          <button class="btn-view" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-eye" style="color: #225aa3ff"></i>
          </button>
          <button class="btn-edit" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-pen-to-square" style="color: #225aa3ff"></i>
          </button>
          <button class="btn-pin ${a.isPinned ? "pinned" : ""}" style="margin: 0 5%" data-id="${a._id}" title="${a.isPinned ? "Unpin" : "Pin"}">
            <i class="fa-solid fa-location-pin" style="font-size:18px; color:${a.isPinned ? "#d4af37" : "#888"};"></i>
          </button>
          <button class="btn-delete" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        `;
      }
      tr.innerHTML = `
        <td>${a.title}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>${a.eventDate ? new Date(a.eventDate).toLocaleString() : "-"}</td>
        <td>${status}</td>
        <td>
          ${actionsHtml}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Helper to get current tab
  function getCurrentTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.tab : "pending";
  }

  // Tab logic
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      renderCurrentTab();
    });
  });

  // Render correct tab view
  function renderCurrentTab() {
    const tab = getCurrentTab();
    // Exclude expired announcements from All and Pinned tabs
    const now = new Date();
    const nonExpired = announcementsData.filter(a => {
      if (a.isActive === false) return false;
      const eventDate = new Date(a.eventDate || a.scheduledDateTime);
      return eventDate >= now;
    });

    if (tab === "pending") {
      // Show only unpinned and non-expired
      const unpinned = nonExpired.filter(a => !a.isPinned);
      renderTable(unpinned);
    } else if (tab === "approved") {
      // Show only pinned and non-expired
      const pinned = nonExpired.filter(a => a.isPinned === true);
      renderTable(pinned);
    } else if (tab === "expired") {
      // Show all expired announcements, most recently expired at the top
      const expired = announcementsData
        .filter(a => {
          const eventDate = new Date(a.eventDate || a.scheduledDateTime);
          return eventDate < now;
        })
        .sort((a, b) => {
          // Sort by eventDate descending (most recently expired first)
          const aDate = new Date(a.eventDate || a.scheduledDateTime);
          const bDate = new Date(b.eventDate || b.scheduledDateTime);
          return bDate - aDate;
        });
      renderTable(expired);
    }
  }

  // On initial load, show only unpinned in "All"
  fetchAnnouncements().then(() => {
    renderCurrentTab();
  });

  // Handle delete, edit, pin/unpin
  document.addEventListener("click", async (e) => {
    const tab = getCurrentTab && getCurrentTab();
    // View action for all tabs
    if (e.target.closest(".btn-view")) {
      const id = e.target.closest(".btn-view").dataset.id;
      // Show the announcement details modal (reuse the view modal logic)
      const announcement = announcementsData.find(a => a._id === id);
      if (announcement) {
        document.getElementById("modalTitle").textContent = (announcement.title || "").toUpperCase();
        document.getElementById("modalEventDate").textContent = announcement.eventDate ? new Date(announcement.eventDate).toLocaleString() : "-";
        document.getElementById("modalPostedDate").textContent = announcement.createdAt ? new Date(announcement.createdAt).toLocaleString() : "-";
        const modalContentEl = document.getElementById("modalContent");
        if (modalContentEl) {
          modalContentEl.value = announcement.content || "";
        }
        const viewModal = document.getElementById("announcementModal");
        viewModal.style.display = "flex";
        // trigger reflow then add show class so CSS transitions apply
        viewModal.offsetHeight;
        viewModal.classList.add('show');
      }
      if (tab === "expired") return;
    }

    // DELETE
    if (e.target.closest(".btn-delete")) {
      const id = e.target.closest(".btn-delete").dataset.id;
      // ...existing code...
      const swalResult = await Swal.fire({
        title: 'Delete announcement?',
        text: 'Are you sure you want to delete this announcement? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
      });
      if (swalResult && swalResult.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            emitAnnouncementEvent("deleted", { id });
            await fetchAnnouncements();
            renderCurrentTab();
            await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Announcement deleted.' });
          } else {
            const text = await res.text().catch(()=>null);
            console.error('Delete failed', text);
            Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Could not delete announcement.' });
          }
        } catch (err) {
          console.error("Delete error:", err);
          Swal.fire({ icon: 'error', title: 'Delete failed', text: 'An error occurred while deleting.' });
        }
      }
    }

    // EDIT
    if (e.target.closest(".btn-edit")) {
      const id = e.target.closest(".btn-edit").dataset.id;
      // ...existing code...
      try {
        const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch announcement");
        const announcement = await res.json();
        const a = announcement.announcement || announcement;

        document.getElementById("title").value = a.title;
        document.getElementById("content").value = a.content;

        if (a.eventDate) {
          const dt = new Date(a.eventDate);
          document.getElementById("date").value = dt.toISOString().split("T")[0];
          document.getElementById("time").value = dt.toTimeString().slice(0,5);
        }

        // Update modal header for editing
        const modalHeader = document.querySelector('.modal-header h2');
        if (modalHeader) {
          modalHeader.textContent = 'Edit Announcement';
        }

        editingId = id;
        showModal();
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
        const res = await fetch(`${API_BASE}/api/announcements/${id}/pin`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isPinned: !isPinned })
        });
        if (res.ok) {
          emitAnnouncementEvent(isPinned ? "unpinned" : "pinned", { id, isPinned: !isPinned });
          await fetchAnnouncements();
          renderCurrentTab();
        } else {
          alert("Failed to pin/unpin announcement");
        }
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

    // Client-side validation: ensure eventDate is valid and not in the past when creating
    const now = new Date();
    if (isNaN(eventDate.getTime())) {
      await Swal.fire({ icon: 'error', title: 'Invalid Date', text: 'Please provide a valid date and time.' });
      return;
    }
    if (!editingId && eventDate < now) {
      await Swal.fire({ icon: 'warning', title: "Can't create announcement", text: 'Event date must be in the future.' });
      return;
    }

    try {
      let url = `${API_BASE}/api/announcements`;
      let method = "POST";

      if (editingId) {
        url = `${API_BASE}/api/announcements/${editingId}`;
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
        const result = await res.json();
        const announcement = result.announcement || result;
        
        // Emit WebSocket event for real-time updates
        if (editingId) {
          emitAnnouncementEvent("updated", announcement);
        } else {
          emitAnnouncementEvent("created", announcement);
        }
        
        hideModal(); // Use the new hide function
        form.reset();
        editingId = null;
        await fetchAnnouncements();
        renderCurrentTab();
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

  // Close view modal (use same show/hide pattern)
  const closeAnnouncementModalBtn = document.getElementById("closeAnnouncementModal");
  const announcementModalEl = document.getElementById("announcementModal");
  function hideAnnouncementModal() {
    if (!announcementModalEl) return;
    announcementModalEl.classList.remove('show');
    setTimeout(() => {
      announcementModalEl.style.display = 'none';
    }, 200);
  }
  if (closeAnnouncementModalBtn) {
    closeAnnouncementModalBtn.onclick = hideAnnouncementModal;
  }
  window.onclick = function(event) {
    if (event.target == announcementModalEl) {
      hideAnnouncementModal();
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

  fetchAnnouncements();
  });

  const SOCKET_API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

  const socket = io(SOCKET_API_BASE, { transports: ["websocket"] });

socket.on("educational-assistance:newSubmission", (data) => {
  Swal.fire({
    icon: 'info',
    title: 'New Educational Assistance Application',
    text: 'A new application has arrived!',
    timer: 8000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
  // Optionally refresh or update something if needed
});

// Emit WebSocket events for real-time updates
function emitAnnouncementEvent(eventType, data) {
  socket.emit(`announcement:${eventType}`, data);
}