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
  btn.onclick = () => modal.style.display = "block";
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
      const announcements = await res.json();
      renderTable(announcements);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  // Render table rows
  function renderTable(data) {
    tableBody.innerHTML = "";
    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="3">No announcements found</td></tr>`;
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
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Handle delete, view, and edit
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
        alert(`Title: ${announcement.title}\n\nContent: ${announcement.content}`);
      } catch (err) {
        console.error("View error:", err);
      }
    }

    // EDIT
    // EDIT
if (e.target.closest(".btn-edit")) {
  const id = e.target.closest(".btn-edit").dataset.id;
  try {
    const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch announcement");
    const announcement = await res.json();

    // Fill form
    document.getElementById("title").value = announcement.title;
    document.getElementById("content").value = announcement.content;

    // Set date + time separately
    if (announcement.scheduledDateTime) {
      const dt = new Date(announcement.scheduledDateTime);
      document.getElementById("date").value = dt.toISOString().split("T")[0];
      document.getElementById("time").value = dt.toTimeString().slice(0,5);
    }

    editingId = id; // mark as editing
    modal.style.display = "block";
  } catch (err) {
    console.error("Edit error:", err);
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

  // Date + time from form
  const date = document.getElementById("date").value;   // <input type="date" id="date">
  const time = document.getElementById("time").value;   // <input type="time" id="time">

  // Combine into a single ISO datetime string
  const scheduledDateTime = new Date(`${date}T${time}:00`);

  try {
    let url = "http://localhost:5000/api/announcements";
    let method = "POST";

    if (editingId) {
      // If editing, update instead of create
      url = `http://localhost:5000/api/announcements/${editingId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, content, scheduledDateTime })
    });

    if (res.ok) {
      modal.style.display = "none";
      form.reset();
      editingId = null; // reset back to add mode
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