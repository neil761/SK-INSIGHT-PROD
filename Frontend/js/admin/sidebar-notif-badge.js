// Update the sidebar notification badge for KK Profile and LGBTQ Profile

async function updateSidebarNotifBadge() {
  const token = sessionStorage.getItem("token");
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
      ? window.API_BASE
      : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';
  // KK Profile badge
  try {
      const res = await fetch(`${API_BASE}/api/notifications/kk/unread/count`, {
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
      const res = await fetch(`${API_BASE}/api/notifications/lgbtq/unread/count`, {
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
      const res = await fetch(`${API_BASE}/api/notifications/educational/pending/count`, {
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
  const SOCKET_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://sk-insight.online');
  const socket = io(SOCKET_BASE, { transports: ["websocket"] });
  socket.on("kk-profile:newSubmission", () => updateSidebarNotifBadge());
  socket.on("lgbtq-profile:newSubmission", () => updateSidebarNotifBadge());
  // Optionally, emit a socket event for educational-assistance:newSubmission in your backend and listen here:
  socket.on("educational-assistance:newSubmission", () => updateSidebarNotifBadge());
}

(async function updateEducationalBadge() {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';
  const badgeEl = document.getElementById('sidebarEducNotifBadge');
  if (!badgeEl) return;
  const token = sessionStorage.getItem('token') || '';
  try {
    const res = await fetch(`${API_BASE}/api/notifications/educational/pending/count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.warn('Notif count fetch failed', res.status, await res.text().catch(()=>{}));
      badgeEl.style.display = 'none';
      return;
    }
    const data = await res.json().catch(() => null);
    if (data && typeof data.count === 'number' && data.count > 0) {
      badgeEl.textContent = data.count;
      badgeEl.style.display = '';
    } else {
      badgeEl.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to fetch educational notif count:', err);
    badgeEl.style.display = 'none';
  }
})();