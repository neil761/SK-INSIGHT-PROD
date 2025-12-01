document.addEventListener("DOMContentLoaded", () => {

  (function() {
  const token = sessionStorage.getItem("token"); // Only sessionStorage!
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "/Frontend/html/admin/admin-log.html";
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

  const tableBody = document.querySelector(".tables table tbody");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token"); // <-- Updated line
  const searchInput = document.getElementById("userSearch"); // <-- Add this line

  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  let allUsers = []; // Store all users for filtering

  // Fetch all users
  async function fetchUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
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
      tableBody.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
      return;
    }

    data.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", u._id); // For modal
      tr.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td style="text-align: center;">${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
        <td style="text-align: center;">
          <button class="view-btn" data-id="${u._id}" title="View">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach modal openers
    attachUserModalOpeners();
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

  // Initial load
  fetchUsers();

const socket = io(API_BASE, { transports: ["websocket"] });

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
});

function attachUserModalOpeners() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.id;
      // Fetch user details if needed, then show modal
      showUserModal(userId);
    });
  });
}

async function showUserModal(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    const payload = await response.json();
    const user = payload.user || payload;
    const profiles = payload.profiles || {};
    console.log("Modal profile IDs:", profiles);

    // Resolve profile IDs (prefer answered-latest id, fallback to any-profile id, keep legacy keys)
    const kkId = profiles.kkAnsweredLatestId || profiles.kkAnyProfileId || profiles.kkProfileId || null;
    const lgbtqId = profiles.lgbtqAnsweredLatestId || profiles.lgbtqAnyProfileId || profiles.lgbtqProfileId || null;
    const educId = profiles.educationalAnsweredLatestId || profiles.educationalAnyProfileId || profiles.educationalProfileId || null;
    
    Swal.fire({
      showCloseButton: true,
      showConfirmButton: false,
      width: '900px',
      customClass: {
        popup: 'modern-modal',
        closeButton: 'modern-modal-close'
      },
      html: `
        <div class="modern-modal-header" style="background: linear-gradient(135deg, #0A2C59 0%, #1a3f6f 100%); padding: 32px 48px 20px 48px; display: flex; align-items: center; flex-direction: column; position: relative; gap: 8px; border-radius: 28px 28px 0 0;">
          <div style="display:flex; flex-direction:column; align-items: center; text-align: center;">
            <div style="font-size:20px; font-weight:700; color:#fff; line-height:1;">${user.username || user.email || '-'}</div>
            <div style="opacity:0.9; font-size:13px; color:#fff; margin-top:6px;">${user.email || '-'}</div>
          </div>
        </div>

        <div class="modern-modal-body" style="padding: 25px 28px; background: #f8fafc; color: #223; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; overflow-y: auto; max-height: 520px; border-radius: 0 0 28px 28px;">
          
          <!-- User Info Cards Grid (2 columns) - NO username/email here -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 28px;">
            
            <!-- Birthday Card -->
            <div class="profile-detail" style="background: #fff; padding: 16px 20px; border-radius: 14px; box-shadow: 0 2px 8px rgba(10,44,89,0.06); border: 1px solid #f0f4fa;">
              <div style="font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Birthday</div>
              <div style="font-weight: 700; color: #0A2C59; font-size: 16px;">${user.birthday ? new Date(user.birthday).toLocaleDateString() : '-'}</div>
            </div>

            <!-- Age Card -->
            <div class="profile-detail" style="background: #fff; padding: 16px 20px; border-radius: 14px; box-shadow: 0 2px 8px rgba(10,44,89,0.06); border: 1px solid #f0f4fa;">
              <div style="font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Age</div>
              <div style="font-weight: 700; color: #0A2C59; font-size: 16px;">${user.age ?? '-'}</div>
            </div>

            <!-- Account Created Card (Full Width) -->
            <div class="profile-detail" style="background: #fff; padding: 16px 20px; border-radius: 14px; box-shadow: 0 2px 8px rgba(10,44,89,0.06); border: 1px solid #f0f4fa; grid-column: 1 / -1;">
              <div style="font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Account Created</div>
              <div style="font-weight: 700; color: #0A2C59; font-size: 16px;">${user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</div>
            </div>
          </div>

          <!-- Submitted Forms Section -->
          <div style="background: #fff; padding: 20px; border-radius: 14px; box-shadow: 0 2px 8px rgba(10,44,89,0.06); border: 1px solid #f0f4fa;">
            <h3 style="margin: 0 0 18px 0; font-size: 16px; font-weight: 700; color: #0A2C59; letter-spacing: 0.3px;">Submitted Forms</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
              
              <!-- KK Profiling -->
              <div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #07B0F2;">
                <div style="font-weight: 700; color: #0A2C59; font-size: 14px; letter-spacing: 0.2px;">KK Profiling</div>
                ${kkId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/KK-Profile.html', '${kkId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #07B0F2; color: #fff; border: none; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s;">
                  <i class="fas fa-arrow-up-right-from-square"></i> View
                </a>` : `<div style="color: #888; font-size: 13px; font-weight: 500;">Not submitted</div>`}
              </div>

              <!-- LGBTQIA+ Profiling -->
              <div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #8b5cf6;">
                <div style="font-weight: 700; color: #0A2C59; font-size: 14px; letter-spacing: 0.2px;">LGBTQIA+ Profiling</div>
                ${lgbtqId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/LGBTQ-Profile.html', '${lgbtqId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s;">
                  <i class="fas fa-arrow-up-right-from-square"></i> View
                </a>` : `<div style="color: #888; font-size: 13px; font-weight: 500;">Not submitted</div>`}
              </div>

              <!-- Educational Assistance -->
              <div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #06b6d4;">
                <div style="font-weight: 700; color: #0A2C59; font-size: 14px; letter-spacing: 0.2px;">Educational Assistance</div>
                ${educId ? `<a href="#" onclick="window.openProfileTabWithToken('/Frontend/html/admin/Educational-Assistance-admin.html', '${educId}'); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: #06b6d4; color: #fff; border: none; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s;">
                  <i class="fas fa-arrow-up-right-from-square"></i> View
                </a>` : `<div style="color: #888; font-size: 13px; font-weight: 500;">Not submitted</div>`}
              </div>
            </div>
          </div>

        </div>
      `
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load user details'
    });
  }
}

// Helper to open profile tab and transfer session token via BroadcastChannel
function openProfileTabWithToken(url, profileId) {
  const tab = window.open(`${url}?id=${encodeURIComponent(profileId)}`, '_blank');
  const token = sessionStorage.getItem("token");
  if (token && tab) {
    const channel = new BroadcastChannel("skinsight-auth");
    setTimeout(() => {
      channel.postMessage({ token });
      channel.close();
    }, 500);
  }
}

// Make helper available globally for modal HTML
window.openProfileTabWithToken = openProfileTabWithToken;
