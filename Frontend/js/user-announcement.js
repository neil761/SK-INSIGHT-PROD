document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".announcement-table tbody");
  const modal = document.getElementById("announcementModal");
  const modalTitle = modal.querySelector(".modal-header h3");
  const modalEventDate = modal.querySelector(".event-date");
  const modalCreatedDate = modal.querySelector(".created-date");
  const modalDescription = modal.querySelector(".description");
  const closeModalBtn = modal.querySelector(".close-modal");

  // Fetch announcements
async function fetchAnnouncements() {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/announcements", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("Fetch failed:", res.status, await res.text());
      throw new Error("Failed to fetch announcements");
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Failed to fetch announcements");
    }

    renderAnnouncements(data.announcements || []);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center">Error loading announcements</td>
      </tr>
    `;
  }
}



  // Render announcements into table
  function renderAnnouncements(announcements) {
    tableBody.innerHTML = "";

    // Filter out expired announcements
    const now = new Date();
    const upcomingAnnouncements = announcements.filter(a => {
      const ev = new Date(a.eventDate);
      return ev >= now;
    });

    // Sort and limit to 5
    upcomingAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    const limitedAnnouncements = upcomingAnnouncements.slice(0, 5);

    // Render actual announcements
    limitedAnnouncements.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="announcement-title">
            <i class="fa-solid fa-bullhorn"></i>
            ${a.title}
          </div>
        </td>
        <td>${a.eventDate ? formatDateTime(a.eventDate) : "-"}</td>
        <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
        <td>
          <button class="view-btn" data-id="${a._id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Fill remaining rows with "No Announcement yet."
    for (let i = limitedAnnouncements.length; i < 5; i++) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td colspan="4" style="text-align:center; color: #888;">No announcements yet</td>
  `;
  tableBody.appendChild(tr);
}
  }

  // Handle view button clicks (modal)
  document.addEventListener("click", async (e) => {
  if (e.target.closest(".view-btn")) {
    const id = e.target.closest(".view-btn").dataset.id;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Announcement not found");
      const { announcement } = await res.json();

      modalTitle.textContent = announcement.title;
      modalEventDate.textContent = formatDateTime(announcement.eventDate);
      modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
      modalDescription.textContent = announcement.content;

      modal.classList.add("active");
    } catch (err) {
      console.error("Error fetching announcement:", err);
      alert("Failed to load announcement details");
    }
  }
});


  // Close modal
  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  // Helpers
  function formatDateTime(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  }

  function getAnnouncementStatus(eventDate) {
    if (!eventDate) return "Unknown";
    const now = new Date();
    const ev = new Date(eventDate);
    return ev >= now ? "Upcoming" : "Expired";
  }

  // Initial load
  fetchAnnouncements();
});

document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    console.log('hamburger:', hamburger, 'mobileMenu:', mobileMenu);
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }
});