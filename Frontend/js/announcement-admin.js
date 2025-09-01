document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".tables table tbody");
  const token = localStorage.getItem("token");
  const modal = document.getElementById("myModal");
  const btn = document.getElementById("myBtn");
  const span = document.querySelector(".close");
  const form = document.getElementById("announcementForm");

  // Save the default form submit handler so you can restore it after editing
  const defaultFormSubmit = form.onsubmit;

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
      renderTable(data.announcements || []);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  // Render table rows (with pin/unpin button)
  function renderTable(data) {
    tableBody.innerHTML = "";
    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="4">No announcements found</td></tr>`;
      return;
    }
    data.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.title}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn-view" data-id="${a._id}"><i class="fa-solid fa-eye"></i></button>
          <button class="btn-edit" data-id="${a._id}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn-delete" data-id="${a._id}"><i class="fa-solid fa-trash"></i></button>
          <button class="btn-pin ${a.isPinned ? "pinned" : ""}" data-id="${a._id}" title="${a.isPinned ? "Unpin" : "Pin"}">
            <span style="font-size:18px;color:${a.isPinned ? "#d4af37" : "#888"};">📌</span>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

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
        const a = announcement.announcement || announcement; // support both structures
        alert(`Title: ${a.title}\n\nContent: ${a.content}`);
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

  // Keep track if editing or adding
  let editingId = null;

  // Handle form submit (Add or Edit)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const eventDate = new Date(`${date}T${time}:00`);

    // Add these lines to get category and expiresAt
    const category = "General"; // or get from a dropdown if you have one
    const expiresAt = new Date(eventDate.getTime() + 2 * 24 * 60 * 60 * 1000); // expires 2 days after eventDate

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

  fetchAnnouncements();
});