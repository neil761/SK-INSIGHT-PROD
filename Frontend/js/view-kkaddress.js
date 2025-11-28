document.addEventListener("DOMContentLoaded", async function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  // if (!validateTokenAndRedirect("KK Address Profile")) {
  //   return;
  // }
  
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // =========================
  // FETCH & POPULATE KK PROFILE DATA
  // =========================
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/kkprofiling/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        document.getElementById("region").value = data.region || "";
        document.getElementById("province").value = data.province || "";
        document.getElementById("municipality").value = data.municipality || "";
        document.getElementById("barangay").value = data.barangay || "";
        document.getElementById("purok").value = data.purok || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("contactNumber").value = data.contactNumber || "";
        document.getElementById("civilStatus").value = data.civilStatus || "";
      }
    } catch (err) {
      console.error("Failed to fetch KKProfile data:", err);
    }
  }

  // =========================
  // NAVBAR TOGGLER (Hamburger)
  // =========================
  const hamburger = document.getElementById("navbarHamburger");
  const mobileMenu = document.getElementById("navbarMobileMenu");

  // Navbar behavior is centralized in `navbar.js`.
  // Local hamburger/menu listeners removed to avoid duplicate bindings.

  // =========================
  // KK PROFILE NAVIGATION
  // =========================
  // KK Profile nav implementation removed — centralized in `navbar.js`.
  // `navbar.js` will provide the KK navigation behavior and will call
  // any page-level handler if required for backward compatibility.

  // =========================
  // LGBTQ+ PROFILE NAVIGATION
  // =========================
  // LGBTQ+ nav implementation removed — centralized in `navbar.js`.
  // `navbar.js` will handle the LGBTQ navigation flow and call any
  // page-level handlers if needed for compatibility.

  // =========================
  // EDUCATIONAL ASSISTANCE NAVIGATION
  // =========================
  // Educational Assistance nav implementation removed — centralized in `navbar.js`.
  // `navbar.js` will manage the check-rejected flow and navigation for
  // Educational Assistance and will call page handlers if present.

  // Navigation buttons are bound centrally by `navbar.js` via the
  // guarded bootstrap near the end of this file. Keep the handler
  // functions available (e.g. `handleKKProfileNavClick`) so the
  // central binder can attach them.

     
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: '../../Educational-assistance-user.html' }); }
        catch (err) { handleEducAssistanceNavClick(e); }
      } else {
        handleEducAssistanceNavClick(e);
      }
    });
  }

  attachEducHandler(document.getElementById('educAssistanceNavBtnDesktop'));
  attachEducHandler(document.getElementById('educAssistanceNavBtnMobile'));

  // Embed educRejected helper so this page can prompt to reapply if needed
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = '../../Educational-assistance-user.html',
        draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
        formName = 'Educational Assistance',
        apiBase = API_BASE
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

        if (!isFormOpen && hasProfile && isApproved) {
          const res2 = await Swal.fire({ icon: 'info', title: `The ${formName} is currently closed`, text: `Your application has been approved. Do you want to view your response?`, showCancelButton: true, confirmButtonText: 'Yes, view my response', cancelButtonText: 'No' });
          if (res2 && res2.isConfirmed) { window.location.href = `educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
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

  // Centralize navbar wiring: remove page-local nav listeners (if any) and let navbar.js bind handlers.
  document.addEventListener('DOMContentLoaded', function () {
    try {
      const ids = ['navbarHamburger','navbarMobileMenu','kkProfileNavBtnDesktop','kkProfileNavBtnMobile','lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          const clone = el.cloneNode(true);
          el.parentNode.replaceChild(clone, el);
        }
      });

      if (window && typeof window.bindNavButton === 'function') {
        try {
          window.bindNavButton('kkProfileNavBtnDesktop','kkProfileNavBtnMobile','handleKKProfileNavClick');
          window.bindNavButton('lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','handleLGBTQProfileNavClick');
          window.bindNavButton('educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile','handleEducAssistanceNavClick');
        } catch (e) { console.warn('navbar binding failed', e); }
      }
    } catch (e) {
      console.warn('Failed to centralize navbar wiring', e);
    }
  });
