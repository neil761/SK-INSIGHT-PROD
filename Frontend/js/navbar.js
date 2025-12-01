document.addEventListener('DOMContentLoaded', function () {

  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  // Mobile menu toggle
  // Mobile menu toggle logic extracted into an initializer so other pages can
  // call it (in case scripts load in different orders).
  function initNavbarHamburger() {
    const hamburger = document.getElementById('navbarHamburger');
    const mobileMenu = document.getElementById('navbarMobileMenu');
    if (!hamburger || !mobileMenu) return;
    // remove any previous handlers to avoid double-binding
    try {
      hamburger.replaceWith(hamburger.cloneNode(true));
    } catch (e) {
      // ignore if replace fails
    }
    const newHamburger = document.getElementById('navbarHamburger') || hamburger;
    newHamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    // Ensure clicking outside closes the menu
    document.addEventListener('click', function (e) {
      try {
        if (!(newHamburger.contains(e.target)) && !mobileMenu.contains(e.target)) {
          mobileMenu.classList.remove('active');
        }
      } catch (err) {
        // ignore
      }
    });
  }

  // Expose initializer for pages that want to call it explicitly
  if (typeof window !== 'undefined') window.initNavbarHamburger = initNavbarHamburger;
  // Also initialize immediately so the hamburger works even if other
  // page scripts attempted to call `initNavbarHamburger` before this
  // file loaded (handles different script load orders).
  try { initNavbarHamburger(); } catch (e) { /* ignore init errors */ }

  // Show login strip if not logged in and disable nav buttons
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) loginStrip.style.display = 'flex';
    document.body.classList.add('has-login-strip');

    const navSelectors = [
      '.navbar-center a',
      '.navbar-right a',
      '.navbar-mobile-menu a',
      '.announcement-btn',
      '#userProfileBtn',
      '.prof',
      '.nav-btn'
    ];
    navSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          // If you want a login prompt here, you can call Swal.fire from the page.
        });
      });
    });
  }

  // Utility to bind a nav button pair to an existing global handler if present,
  // otherwise fall back to following the link href.
  // Local handler registry (we'll populate these functions below).
  const localHandlers = {};

  function bindNavButton(desktopId, mobileId, handlerName) {
    function onClick(e) {
      e.preventDefault();
      // Prefer local handler defined in this navbar file
      if (typeof localHandlers[handlerName] === 'function') {
        try { return localHandlers[handlerName](e); } catch (err) { console.error(err); }
      }
      // Then check for a global handler (backwards compat)
      if (typeof window[handlerName] === 'function') {
        try { return window[handlerName](e); } catch (err) { console.error(err); }
      }
      const href = (e.currentTarget && e.currentTarget.getAttribute) ? e.currentTarget.getAttribute('href') : null;
      if (href) window.location.href = href;
    }
    const d = document.getElementById(desktopId);
    const m = document.getElementById(mobileId);
    if (d) d.addEventListener('click', onClick);
    if (m) m.addEventListener('click', onClick);
  }

  // Helper: try to fetch `/api/users/me` to determine account birthday/age
  async function fetchAccountAge(token) {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const u = await res.json().catch(() => null);
      if (!u) return null;
      if (typeof u.age !== 'undefined' && u.age !== null) return Number(u.age);
      if (u.birthday) {
        const bd = (u.birthday.split ? u.birthday.split('T')[0] : u.birthday);
        const d = new Date(bd);
        if (!isNaN(d)) {
          const today = new Date();
          let a = today.getFullYear() - d.getFullYear();
          const m = today.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
          return a;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // Bind KK and LGBTQ navs to page-provided handlers when available
  bindNavButton('kkProfileNavBtnDesktop', 'kkProfileNavBtnMobile', 'handleKKProfileNavClick');
  bindNavButton('lgbtqProfileNavBtnDesktop', 'lgbtqProfileNavBtnMobile', 'handleLGBTQProfileNavClick');

  // Educational Assistance attach logic — tries a check-rejected endpoint first,
  // then calls the page-provided `handleEducAssistanceNavClick` handler if present.
  (function attachEducReapplyHandler() {
    const desktopBtn = document.getElementById('educAssistanceNavBtnDesktop');
    const mobileBtn = document.getElementById('educAssistanceNavBtnMobile');

    async function onEducClick(e) {
      e.preventDefault();
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      // If not logged in, let the page handler decide (it typically shows login)
      if (!token) return typeof window.handleEducAssistanceNavClick === 'function' ? window.handleEducAssistanceNavClick(e) : window.location.href = '/Frontend/html/user/login.html';

      try {
        const res = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const check = await res.json().catch(() => null);
          if (check && check.rejected && check.applicationId) {
            // If the page provides a handler, let it deal with showing the "reapply" flow.
            if (typeof window.handleEducAssistanceNavClick === 'function') return window.handleEducAssistanceNavClick(e);
            // Fallback: redirect to the user educational assistance page
            return window.location.href = '/Frontend/html/user/Educational-assistance-user.html';
          }
        }
      } catch (err) {
        console.debug('check-rejected failed', err);
      }

      // Default: call page handler if present, otherwise follow href
      if (typeof window.handleEducAssistanceNavClick === 'function') return window.handleEducAssistanceNavClick(e);
      const href = (e.currentTarget && e.currentTarget.getAttribute && e.currentTarget.getAttribute('href')) || '/Frontend/html/user/Educational-assistance-user.html';
      window.location.href = href;
    }

    if (desktopBtn) desktopBtn.addEventListener('click', onEducClick);
    if (mobileBtn) mobileBtn.addEventListener('click', onEducClick);
  })();
  // Register local handlers (so bindNavButton prefers them)
  (function registerLocalHandlers() {
    // KK Profile Navigation
    async function handleKKProfileNavClick(event) {
      event.preventDefault();
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      try {
        const [cycleRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/formcycle/status?formName=KK%20Profiling`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/kkprofiling/me`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const cycleData = await cycleRes.json().catch(() => null);
        const profileData = await profileRes.json().catch(() => ({}));
        // Age restriction: prefer account-level age from /api/users/me so users without a profile are still checked
        try {
          const accountAge = await fetchAccountAge(token);
          if (accountAge !== null && accountAge >= 11 && accountAge <= 14) {
            await Swal.fire({ icon: 'warning', title: 'Age Restriction', text: 'Only 15 years old and above can access this form.' });
            return;
          }
          // Fallback: if no account age, try profile-derived age as before
          let ageVal = null;
          if (profileData) {
            if (typeof profileData.age !== 'undefined' && profileData.age !== null) ageVal = Number(profileData.age);
            else if (profileData.birthday) {
              const bd = (profileData.birthday.split ? profileData.birthday.split('T')[0] : profileData.birthday);
              const d = new Date(bd);
              if (!isNaN(d)) {
                const today = new Date();
                let a = today.getFullYear() - d.getFullYear();
                const m = today.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
                ageVal = a;
              }
            }
          }
          if (ageVal !== null && ageVal >= 11 && ageVal <= 14) {
            await Swal.fire({ icon: 'warning', title: 'Age Restriction', text: 'Only 15 years old and above can access this form.' });
            return;
          }
        } catch (ageErr) { /* ignore age check errors */ }
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const formName = latestCycle?.formName || "KK Profiling";
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = profileRes.ok && profileData && profileData._id;

        if (!isFormOpen && hasProfile) {
          const result = await Swal.fire({ icon: "info", title: `The ${formName} is currently closed`, text: `but you already have a ${formName} profile. Do you want to view your response?`, showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/kkcofirmation.html";
          return;
        }
        if (!isFormOpen && !hasProfile) {
          await Swal.fire({ icon: "warning", title: `The ${formName} form is currently closed`, text: "You cannot submit a new response at this time.", confirmButtonText: "OK" });
          return;
        }
        if (isFormOpen && hasProfile) {
          const result = await Swal.fire({ title: `You already answered ${formName} Form`, text: "Do you want to view your response?", icon: "info", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/kkcofirmation.html";
          return;
        }
        if (isFormOpen && !hasProfile) {
          const result = await Swal.fire({ icon: "info", title: `No profile found`, text: `You don't have a profile yet. Please fill out the form to create one.`, showCancelButton: true, confirmButtonText: "Go to form", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/kkform-personal.html";
          return;
        }
      } catch (err) {
        console.error(err);
        window.location.href = "/Frontend/html/user/kkform-personal.html";
      }
    }

    // LGBTQ+ Profile Navigation
    async function handleLGBTQProfileNavClick(event) {
      event.preventDefault();
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      try {
        const [cycleRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/formcycle/status?formName=LGBTQIA%2B%20Profiling`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/lgbtqprofiling/me/profile`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const cycleData = await cycleRes.json().catch(() => null);
        const profileData = await profileRes.json().catch(() => ({}));
        // Age restriction: prefer account-level age from /api/users/me so users without a profile are still checked
        try {
          const accountAge = await fetchAccountAge(token);
          if (accountAge !== null && accountAge >= 11 && accountAge <= 14) {
            await Swal.fire({ icon: 'warning', title: 'Age Restriction', text: 'Only 15 years old and above can access this form.' });
            return;
          }
          // Fallback: if no account age, try profile-derived age as before
          let ageVal = null;
          if (profileData) {
            if (typeof profileData.age !== 'undefined' && profileData.age !== null) ageVal = Number(profileData.age);
            else if (profileData.birthday) {
              const bd = (profileData.birthday.split ? profileData.birthday.split('T')[0] : profileData.birthday);
              const d = new Date(bd);
              if (!isNaN(d)) {
                const today = new Date();
                let a = today.getFullYear() - d.getFullYear();
                const m = today.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
                ageVal = a;
              }
            }
          }
          if (ageVal !== null && ageVal >= 11 && ageVal <= 14 ) {
            await Swal.fire({ icon: 'warning', title: 'Age Restriction', text: 'Only 15 years old and above can access this form.' });
            return;
          }
        } catch (ageErr) { /* ignore age check errors */ }
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = profileData && profileData._id ? true : false;

        if (!isFormOpen && hasProfile) {
          const result = await Swal.fire({ icon: "info", title: `The ${formName} is currently closed`, text: `but you already have a ${formName} profile. Do you want to view your response?`, showCancelButton: true, confirmButtonText: " Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/lgbtqconfirmation.html";
          return;
        }
        if (!isFormOpen && !hasProfile) {
          await Swal.fire({ icon: "warning", title: `The ${formName} form is currently closed`, text: "You cannot submit a new response at this time.", confirmButtonText: "OK" });
          return;
        }
        if (isFormOpen && hasProfile) {
          const result = await Swal.fire({ title: `You already answered ${formName} Form`, text: "Do you want to view your response?", icon: "info", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/lgbtqconfirmation.html";
          return;
        }
        if (isFormOpen && !hasProfile) {
          const result = await Swal.fire({ icon: "info", title: `No profile found`, text: `You don't have a profile yet. Please fill out the form to create one.`, showCancelButton: true, confirmButtonText: "Go to form", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/lgbtqform.html";
          return;
        }
      } catch (err) {
        console.error(err);
        window.location.href = "/Frontend/html/user/lgbtqform.html";
      }
    }

    // Educational Assistance Navigation
    async function handleEducAssistanceNavClick(event) {
      event.preventDefault();
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        const res = await Swal.fire({ icon: 'warning', title: 'You need to log in first', text: 'Please log in to access Educational Assistance.', confirmButtonText: 'OK' });
        if (res) window.location.href = '/Frontend/html/user/login.html';
        return;
      }

      // Check if the user's latest application was rejected
      try {
        const checkRes = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, { headers: { Authorization: `Bearer ${token}` } });
        if (checkRes.ok) {
          const checkData = await checkRes.json().catch(() => null);
          if (checkData && checkData.rejected && checkData.applicationId) {
            const result = await Swal.fire({ icon: 'error', title: 'Application Rejected', html: `<div><p>Your Educational Assistance application was rejected.</p><p>Reason: <b>${checkData.rejectionReason || "No reason provided"}</b></p><p>You may edit and resubmit your application.</p></div>`, showCancelButton: true, confirmButtonText: "Edit & Resubmit", cancelButtonText: "Cancel", confirmButtonColor: "#07B0F2", cancelButtonColor: "#0A2C59" });
            if (result.isConfirmed) {
              window.location.href = `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${checkData.applicationId}`;
              return;
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error checking rejected application:', err);
      }

      try {
        const [cycleRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/formcycle/status?formName=Educational%20Assistance`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/educational-assistance/me`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const cycleData = await cycleRes.json().catch(() => null);
        const profileData = await profileRes.json().catch(() => ({}));
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const formName = latestCycle?.formName || "Educational Assistance";
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = profileData && profileData._id ? true : false;
        const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
        const isRejected = Boolean((profileData && (profileData.rejected === true || profileData.isRejected === true)) || (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal)));
        const isApproved = Boolean((profileData && (profileData.status === 'approved' || profileData.approved === true)) || (typeof statusVal === 'string' && /approve|approved/i.test(statusVal)));

        if (!isFormOpen && hasProfile && isApproved) {
          const result = await Swal.fire({ icon: "info", title: `The ${formName} is currently closed`, text: `but you already have an application. Do you want to view your response?`, showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
          return;
        }
        if (!isFormOpen && (!hasProfile || isRejected)) {
          await Swal.fire({ icon: "warning", title: `The ${formName} form is currently closed`, text: "You cannot submit a new application at this time.", confirmButtonText: "OK" });
          return;
        }
        if (isFormOpen && hasProfile && isApproved) {
          const result = await Swal.fire({ title: `You already applied for ${formName}`, text: "Do you want to view your response?", icon: "info", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
          return;
        }
        if (isFormOpen && hasProfile && !isApproved && !isRejected) {
          const result = await Swal.fire({ title: `You already applied for ${formName}`, text: "Do you want to view your response?", icon: "info", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No" });
          if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
          return;
        }
        if (isFormOpen && (!hasProfile || isRejected)) {
          if (isRejected) {
            await Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the resubmission page.' });
            try { sessionStorage.removeItem('educDraft'); sessionStorage.removeItem('educationalDraft'); sessionStorage.removeItem('educAssistanceDraft'); } catch (e) {}
            window.location.href = "/Frontend/html/user/confirmation/html/editEducRejected.html";
          } else {
            const message = `You don't have an application yet. Please fill out the form to create one.`;
            const result = await Swal.fire({ icon: "info", title: 'No application found', text: message, showCancelButton: true, confirmButtonText: "Go to form", cancelButtonText: "No" });
            if (result.isConfirmed) {
              try { sessionStorage.removeItem('educDraft'); sessionStorage.removeItem('educationalDraft'); sessionStorage.removeItem('educAssistanceDraft'); } catch (e) {}
              window.location.href = "/Frontend/html/user/Educational-assistance-user.html";
            }
          }
          return;
        }
      } catch (err) {
        console.error(err);
        window.location.href = "/Frontend/html/user/Educational-assistance-user.html";
      }
    }

    // register into localHandlers map
    localHandlers['handleKKProfileNavClick'] = handleKKProfileNavClick;
    localHandlers['handleLGBTQProfileNavClick'] = handleLGBTQProfileNavClick;
    localHandlers['handleEducAssistanceNavClick'] = handleEducAssistanceNavClick;

    // also expose to window for backwards compatibility
    if (typeof window !== 'undefined') {
      window.handleKKProfileNavClick = handleKKProfileNavClick;
      window.handleLGBTQProfileNavClick = handleLGBTQProfileNavClick;
      window.handleEducAssistanceNavClick = handleEducAssistanceNavClick;
    }
  })();

});
