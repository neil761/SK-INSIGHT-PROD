document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addressForm');
  const saved = JSON.parse(sessionStorage.getItem('kkProfileStep2') || '{}');
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
      ? window.API_BASE
      : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : 'https://sk-insight.online';

  // Get email from user info (from sessionStorage or localStorage after login/signup)
  let userEmail = "";
  try {
    // Try sessionStorage first, then localStorage
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    userEmail = user.email || "";
  } catch (e) {
    userEmail = "";
  }

  // If userEmail is still empty, try to fetch from backend using token
  if (!userEmail) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(user => {
          if (user.email && !document.getElementById('email').value) {
            document.getElementById('email').value = user.email;
          }
        })
        .catch(() => {});
    }
  }

  document.getElementById('region').value = saved.region || '4-A CALABARZON';
  document.getElementById('province').value = saved.province || 'Batangas';
  document.getElementById('municipality').value = saved.municipality || 'Calaca City';
  document.getElementById('barangay').value = saved.barangay || 'Puting Bato West';
  document.getElementById('purok').value = saved.purok || '';
  // Default email: saved value, or user email from signup, or empty
  document.getElementById('email').value = saved.email || userEmail || '';
  document.getElementById('contactNumber').value = saved.contactNumber || '';
  document.getElementById('civilStatus').value = saved.civilStatus || '';

  // Prefill address fields from most recent KK profile (active or fallback).
  // Uses cached `kkRecentProfile` in sessionStorage when available.
  (async () => {
    try {
      const cacheKey = 'kkRecentProfile';
      let recent = null;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try { recent = JSON.parse(cached); } catch (e) { recent = null; }
      }
      if (!recent) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;
        const r = await fetch(`${API_BASE}/api/kkprofiling/me/recent`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { recent = await r.json().catch(() => null); if (recent) sessionStorage.setItem(cacheKey, JSON.stringify(recent)); }
      }
      if (!recent) return;
      const p = recent.profile || recent;
      if (!p) return;

      const saved2 = JSON.parse(sessionStorage.getItem('kkProfileStep2') || '{}');

      function fillIfEmpty(elId, savedKey, value) {
        if (!value) return false;
        const el = document.getElementById(elId);
        if (!el) return false;
        if ((saved2 && saved2[savedKey]) || (el.value && el.value !== '')) return false;
        el.value = value;
        saved2[savedKey] = value;
        return true;
      }

      fillIfEmpty('region', 'region', p.region);
      fillIfEmpty('province', 'province', p.province);
      fillIfEmpty('municipality', 'municipality', p.municipality);
      fillIfEmpty('barangay', 'barangay', p.barangay);
      fillIfEmpty('purok', 'purok', p.purok);
      fillIfEmpty('email', 'email', p.email);
      fillIfEmpty('contactNumber', 'contactNumber', p.contactNumber);
      fillIfEmpty('civilStatus', 'civilStatus', p.civilStatus);

      try { sessionStorage.setItem('kkProfileStep2', JSON.stringify(saved2)); } catch (e) { /* ignore */ }
    } catch (err) {
      // ignore
      console.warn('Failed to fetch recent KK profile for address:', err);
    }
  })();

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      region: form.region.value.trim(),
      province: form.province.value.trim(),
      municipality: form.municipality.value.trim(),
      barangay: form.barangay.value.trim(),
      purok: form.purok.value.trim(),
      email: form.email.value.trim(),
      contactNumber: form.contactNumber.value.trim(),
      civilStatus: form.civilStatus.value
    };

    // Validate contact number length
    if (data.contactNumber.length !== 11) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Contact Number',
        text: 'Contact number must be exactly 11 digits.',
      });
      return;
    }

    sessionStorage.setItem('kkProfileStep2', JSON.stringify(data));
    window.location.href = 'kkform-youth.html';
  });

  // When user clicks Previous to return to Personal step, set a flag so Personal
  // knows not to re-show the prefill alert during that navigation.
  const prevBtn = document.getElementById('previousBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      try { sessionStorage.setItem('kkNavigatedFromAddress', '1'); } catch (e) {}
    });
  }



  // Navigation (hamburger + nav button handlers) is centralized in `navbar.js`.
  // This page no longer provides its own nav handlers; keep the helper (below) registered.

  // Embed educRejected helper so this page can prompt to reapply if needed
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = 'Educational-assistance-user.html',
        draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
        formName = 'Educational Assistance',
        apiBase = (typeof API_BASE !== 'undefined' && API_BASE)
          ? API_BASE
          : (typeof window !== 'undefined' && window.API_BASE)
            ? window.API_BASE
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
              ? 'http://localhost:5000'
              : 'https://sk-insight.online'
      } = opts || {};

      if (event && typeof event.preventDefault === 'function') event.preventDefault();

      const token = opts.token || sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };

      try {
        const cycleUrl = `${apiBase}/api/formcycle/status?formName=${encodeURIComponent(formName)}`;
        const profileUrl = `${apiBase}/api/educational-assistance/me`;
        const [cycleRes, profileRes] = await Promise.all([
          fetch(cycleUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const cycleData = await getJsonSafe(cycleRes);
        const profileData = await getJsonSafe(profileRes) || {};
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = Boolean(profileData && (profileData._id || profileData.id));

        const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
        const isRejected = Boolean(
          (profileData && (profileData.rejected === true || profileData.isRejected === true)) ||
          (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal))
        );
        const isApproved = Boolean(
          (profileData && (profileData.status === 'approved' || profileData.approved === true)) ||
          (typeof statusVal === 'string' && /approve|approved/i.test(statusVal))
        );

        // If form is open and the user either has no profile or their previous profile was rejected,
        // behave as follows: when rejected -> inform and redirect to form immediately; when no profile -> offer to go to form.
        if (isFormOpen && (!hasProfile || isRejected)) {
          if (isRejected) {
            await Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the form to submit a new application.' });
            try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
            window.location.href = redirectUrl;
            return { redirected: true, isRejected, hasProfile, isFormOpen };
          } else {
            const text = `You don't have a profile yet. Please fill out the form to create one.`;
            const result = await Swal.fire({ icon: 'info', title: 'No profile found', text, showCancelButton: true, confirmButtonText: 'Go to form', cancelButtonText: 'No' });
            if (result && result.isConfirmed) {
              try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
              window.location.href = redirectUrl;
              return { redirected: true, isRejected, hasProfile, isFormOpen };
            }
          }
        }

        // If the form is closed and the user has a profile, only offer to view the response
        // when the application is approved. For rejected/pending applications just inform or no-op.
        if (!isFormOpen && hasProfile && isApproved) {
          const res2 = await Swal.fire({ icon: 'info', title: `The ${formName} is currently closed`, text: `Your application has been approved. Do you want to view your response?`, showCancelButton: true, confirmButtonText: 'Yes, view my response', cancelButtonText: 'No' });
          if (res2 && res2.isConfirmed) { window.location.href = `./confirmation/html/educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
        }

        return { redirected: false, isRejected, hasProfile, isFormOpen };
      } catch (err) {
        console.error('checkAndPromptEducReapply error', err);
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }
    }

    window.checkAndPromptEducReapply = checkAndPromptEducReapply;
  })();
});


// Navigation UI and wiring are handled by `navbar.js` (no per-page hamburger needed).

