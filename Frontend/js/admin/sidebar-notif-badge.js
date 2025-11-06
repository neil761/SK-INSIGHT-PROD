// Update the sidebar notification badge for KK Profile and LGBTQ Profile

async function updateSidebarNotifBadge() {
  const token = sessionStorage.getItem("token");
  // KK Profile badge
  try {
    const res = await fetch('http://localhost:5000/api/notifications/kk/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    if (sidebarBadge) {
      if (count > 0) {
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = 'inline-block';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }
  } catch (err) {}

  // LGBTQ Profile badge
  try {
    const res = await fetch('http://localhost:5000/api/notifications/lgbtq/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const sidebarBadge = document.getElementById('sidebarLGBTQNotifBadge');
    if (sidebarBadge) {
      if (count > 0) {
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = 'inline-block';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }
  } catch (err) {}

  // Educational Assistance badge (pending applications)
  try {
    const res = await fetch('http://localhost:5000/api/notifications/educational/pending/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const sidebarBadge = document.getElementById('sidebarEducNotifBadge');
    if (sidebarBadge) {
      if (count > 0) {
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = 'inline-block';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }
  } catch (err) {}
}

// Call on load and optionally poll every 10s for real-time
document.addEventListener("DOMContentLoaded", () => {
  updateSidebarNotifBadge();
  setInterval(updateSidebarNotifBadge, 10000);
});

// Optional: Listen for socket events if you want real-time updates
if (window.io) {
  const socket = io("http://localhost:5000", { transports: ["websocket"] });
  socket.on("kk-profile:newSubmission", () => updateSidebarNotifBadge());
  socket.on("lgbtq-profile:newSubmission", () => updateSidebarNotifBadge());
  // Optionally, emit a socket event for educational-assistance:newSubmission in your backend and listen here:
  socket.on("educational-assistance:newSubmission", () => updateSidebarNotifBadge());
}