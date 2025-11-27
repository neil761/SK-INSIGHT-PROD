(function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';
  // Notification badge helper: update navbar badge and per-tab badges (general / for-you)
  async function getJsonSafe(res) {
    try { return await res.json(); } catch (e) { return null; }
  }

  function getToken() { return localStorage.getItem('token') || sessionStorage.getItem('token') || null; }

  async function fetchCurrentUser(token) {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await getJsonSafe(res);
      return data && (data.user || data.userData || data) || null;
    } catch (err) { console.error('fetchCurrentUser error', err); return null; }
  }

  function extractAnnouncementsFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.announcements)) return data.announcements;
    if (Array.isArray(data.data)) return data.data;
    for (const k of ['items','results']) if (Array.isArray(data[k])) return data[k];
    return [];
  }

  function isViewedByUser(announcement, userId) {
    if (!announcement) return false;
    const viewedBy = announcement.viewedBy || [];
    if (!Array.isArray(viewedBy)) return false;
    return viewedBy.map(String).includes(String(userId));
  }

  function countUnread(list, userId, now) {
    let count = 0;
    (list||[]).forEach(a => {
      const isActive = (a.isActive === undefined) ? true : Boolean(a.isActive);
      if (!isActive) return;
      // Determine expiration based on eventDate primarily, fall back to expiresAt
      const eventTime = a.eventDate ? Date.parse(a.eventDate) : NaN;
      if (!isNaN(eventTime) && eventTime < now) return;
      const expireTime = a.expiresAt ? Date.parse(a.expiresAt) : NaN;
      if (!isNaN(expireTime) && expireTime < now) return;
      if (!userId) count++; else if (!isViewedByUser(a, userId)) count++;
    });
    return count;
  }

  function setBadgeElement(el, value, opts={}){
    if (!el) return;
    if (!value || value === 0) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = value > 99 ? '99+' : String(value);
    if (opts.display) el.style.display = opts.display; else el.style.display = 'inline-block';
  }

  async function updateBadgeOnce(){
    const token = getToken();
    const navbarBadges = Array.from(document.querySelectorAll('.notif-badge'));
    const tabBadges = Array.from(document.querySelectorAll('.tab-notif-badge'));
    if (navbarBadges.length === 0 && tabBadges.length === 0) return;
    if (!token) { navbarBadges.forEach(el=>setBadgeElement(el,0)); tabBadges.forEach(el=>setBadgeElement(el,0)); return; }

    const user = await fetchCurrentUser(token);
    const userId = user && (user._id || user.id) ? (user._id || user.id) : null;
    let generalList=[], personalList=[];
    try {
      const [gRes,pRes] = await Promise.all([
        fetch(`${API_BASE}/api/announcements`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/announcements/myannouncements`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const gData = await getJsonSafe(gRes); const pData = await getJsonSafe(pRes);
      generalList = extractAnnouncementsFromResponse(gData).filter(a => (a.recipient == null || a.recipient === undefined));
      personalList = extractAnnouncementsFromResponse(pData);
    } catch (err) { console.warn('Failed to fetch announcements for badge', err); }

    const now = Date.now();
    const unreadGeneral = countUnread(generalList, userId, now);
    const unreadPersonal = countUnread(personalList, userId, now);
    const totalUnread = unreadGeneral + unreadPersonal;

    navbarBadges.forEach(el => setBadgeElement(el, totalUnread, { display: 'flex' }));

    // update specific tab ids if present
    ['badge-general','notif-general'].forEach(id => setBadgeElement(document.getElementById(id), unreadGeneral, { display: 'inline-block' }));
    ['badge-foryou','notif-foryou'].forEach(id => setBadgeElement(document.getElementById(id), unreadPersonal, { display: 'inline-block' }));

    // fallback: update any remaining .tab-notif-badge elements
    tabBadges.forEach(el => {
      if (!el.id || !['badge-general','notif-general','badge-foryou','notif-foryou'].includes(el.id)){
        const parent = el.closest('[data-tab]');
        const tabName = parent ? parent.getAttribute('data-tab') : null;
        if (tabName === 'general') setBadgeElement(el, unreadGeneral, { display: 'inline-block' });
        else if (tabName === 'foryou' || tabName === 'personal') setBadgeElement(el, unreadPersonal, { display: 'inline-block' });
        else setBadgeElement(el, totalUnread, { display: 'inline-block' });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => { updateBadgeOnce(); setInterval(updateBadgeOnce, 60*1000); window.addEventListener('focus', updateBadgeOnce); });
  window.updateNotificationBadge = updateBadgeOnce;

})();
