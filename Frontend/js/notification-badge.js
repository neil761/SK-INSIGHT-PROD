(function () {
  // Notification badge: fetch unread counts from announcements endpoints and update all .notif-badge elements.
  async function getJsonSafe(res) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  }

  async function fetchCurrentUser(token) {
    if (!token) return null;
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await getJsonSafe(res);
      // handle shapes like { user: {...} } or {...}
      return data && (data.user || data.userData || data) || null;
    } catch (err) {
      console.error("fetchCurrentUser error", err);
      return null;
    }
  }

  function extractAnnouncementsFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.announcements)) return data.announcements;
    if (Array.isArray(data.data)) return data.data;
    // try common keys
    for (const k of ["items", "results"]) {
      if (Array.isArray(data[k])) return data[k];
    }
    return [];
  }

  function isViewedByUser(announcement, userId) {
    if (!announcement) return false;
    const viewedBy = announcement.viewedBy || [];
    if (!Array.isArray(viewedBy)) return false;
    return viewedBy.map(String).includes(String(userId));
  }

  async function updateBadgeOnce() {
    const token = getToken();
    const badgeEls = document.querySelectorAll('.notif-badge');
    if (!badgeEls || badgeEls.length === 0) return;

    if (!token) {
      // Not logged in: hide badges
      badgeEls.forEach(el => { el.style.display = 'none'; });
      return;
    }

    const user = await fetchCurrentUser(token);
    const userId = user && (user._id || user.id) ? (user._id || user.id) : null;

    // Fetch general announcements
    let generalList = [];
    try {
      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await getJsonSafe(res);
      generalList = extractAnnouncementsFromResponse(data).filter(a => (a.recipient == null || a.recipient === undefined));
    } catch (err) {
      console.warn("Failed to fetch general announcements", err);
      generalList = [];
    }

    // Fetch personal / for-you announcements
    let personalList = [];
    try {
      const res2 = await fetch("http://localhost:5000/api/announcements/myannouncements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await getJsonSafe(res2);
      personalList = extractAnnouncementsFromResponse(data2);
    } catch (err) {
      console.warn("Failed to fetch personal announcements", err);
      personalList = [];
    }

    // Count unread: an announcement is unread if it's active (isActive != false) and userId not in viewedBy
    const now = Date.now();
    let unread = 0;

    const checkList = (list) => {
      (list || []).forEach(a => {
        const isActive = (a.isActive === undefined) ? true : Boolean(a.isActive);
        if (!isActive) return;
        if (a.expiresAt) {
          const exp = Date.parse(a.expiresAt);
          if (!isNaN(exp) && exp < now) return; // expired
        }
        if (!userId) {
          // no user id: conservative: count general active announcements
          unread++;
        } else {
          if (!isViewedByUser(a, userId)) unread++;
        }
      });
    };

    checkList(generalList);
    checkList(personalList);

    badgeEls.forEach(el => {
      if (unread > 0) {
        el.textContent = unread > 99 ? '99+' : String(unread);
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  // Kick off and poll every 60s
  document.addEventListener('DOMContentLoaded', () => {
    updateBadgeOnce();
    setInterval(updateBadgeOnce, 60 * 1000);
    window.addEventListener('focus', updateBadgeOnce);
  });

  // Expose a global helper so other modules can request an immediate badge refresh
  // Usage: window.updateNotificationBadge()
  window.updateNotificationBadge = updateBadgeOnce;

})();
(function () {
  // Notification badge: fetch unread counts from announcements endpoints and update all .notif-badge elements.
  async function getJsonSafe(res) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  }

  async function fetchCurrentUser(token) {
    if (!token) return null;
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await getJsonSafe(res);
      // handle shapes like { user: {...} } or {...}
      return data && (data.user || data.userData || data) || null;
    } catch (err) {
      console.error("fetchCurrentUser error", err);
      return null;
    }
  }

  function extractAnnouncementsFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.announcements)) return data.announcements;
    if (Array.isArray(data.data)) return data.data;
    // try common keys
    for (const k of ["items", "results"]) {
      if (Array.isArray(data[k])) return data[k];
    }
    return [];
  }

  function isViewedByUser(announcement, userId) {
    if (!announcement) return false;
    const viewedBy = announcement.viewedBy || [];
    if (!Array.isArray(viewedBy)) return false;
    return viewedBy.map(String).includes(String(userId));
  }

  async function updateBadgeOnce() {
    const token = getToken();
    const badgeEls = document.querySelectorAll('.notif-badge');
    if (!badgeEls || badgeEls.length === 0) return;

    if (!token) {
      // Not logged in: hide badges
      badgeEls.forEach(el => { el.style.display = 'none'; });
      return;
    }

    const user = await fetchCurrentUser(token);
    const userId = user && (user._id || user.id) ? (user._id || user.id) : null;

    // Fetch general announcements
    let generalList = [];
    try {
      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await getJsonSafe(res);
      generalList = extractAnnouncementsFromResponse(data).filter(a => (a.recipient == null || a.recipient === undefined));
    } catch (err) {
      console.warn("Failed to fetch general announcements", err);
      generalList = [];
    }

    // Fetch personal / for-you announcements
    let personalList = [];
    try {
      const res2 = await fetch("http://localhost:5000/api/announcements/myannouncements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await getJsonSafe(res2);
      personalList = extractAnnouncementsFromResponse(data2);
    } catch (err) {
      console.warn("Failed to fetch personal announcements", err);
      personalList = [];
    }

    // Count unread: an announcement is unread if it's active (isActive != false) and userId not in viewedBy
    const now = Date.now();
    let unread = 0;

    const checkList = (list) => {
      (list || []).forEach(a => {
        const isActive = (a.isActive === undefined) ? true : Boolean(a.isActive);
        if (!isActive) return;
        if (a.expiresAt) {
          const exp = Date.parse(a.expiresAt);
          if (!isNaN(exp) && exp < now) return; // expired
        }
        if (!userId) {
          // no user id: conservative: count general active announcements
          unread++;
        } else {
          if (!isViewedByUser(a, userId)) unread++;
        }
      });
    };

    checkList(generalList);
    checkList(personalList);

    badgeEls.forEach(el => {
      if (unread > 0) {
        el.textContent = unread > 99 ? '99+' : String(unread);
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
  }

  // Kick off and poll every 60s
  document.addEventListener('DOMContentLoaded', () => {
    updateBadgeOnce();
    setInterval(updateBadgeOnce, 60 * 1000);
    window.addEventListener('focus', updateBadgeOnce);
  });

  // Expose a global helper so other modules can request an immediate badge refresh
  // Usage: window.updateNotificationBadge()
  window.updateNotificationBadge = updateBadgeOnce;

})();
