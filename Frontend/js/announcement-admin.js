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
    if (e.target.closest(".btn-edit")) {
      const id = e.target.closest(".btn-edit").dataset.id;
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch announcement");
        const announcement = await res.json();
        // Fill the form with announcement data
        document.getElementById("title").value = announcement.title;
        document.getElementById("content").value = announcement.content;
        modal.style.display = "block";

        // Change form submit to update mode
        form.onsubmit = async function(ev) {
          ev.preventDefault();
          const newTitle = document.getElementById("title").value;
          const newContent = document.getElementById("content").value;
          try {
            const updateRes = await fetch(`http://localhost:5000/api/announcements/${id}`, {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ title: newTitle, content: newContent })
            });
            if (updateRes.ok) {
              modal.style.display = "none";
              form.reset();
              fetchAnnouncements();
              // Restore form to add mode
              form.onsubmit = defaultFormSubmit;
            } else {
              alert("Failed to update announcement");
            }
          } catch (err) {
            console.error("Update error:", err);
          }
        };
      } catch (err) {
        console.error("Edit error:", err);
      }
    }
  });
  

  // Handle form submit (Add announcement)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    try {
      const res = await fetch("http://localhost:5000/api/announcements", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        modal.style.display = "none";
        form.reset();
        fetchAnnouncements();
      } else {
        alert("Failed to add announcement");
      }
    } catch (err) {
      console.error("Add error:", err);
    }
  });

  fetchAnnouncements();
});