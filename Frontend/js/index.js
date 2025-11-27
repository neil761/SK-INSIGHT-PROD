document.addEventListener('DOMContentLoaded', function() {

  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';


  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  // Handle mobile menu toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // Show login strip if not logged in
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) {
      loginStrip.style.display = 'flex';
    }
    document.body.classList.add('has-login-strip');

    // Disable all navbar buttons for non-logged-in users
    const navSelectors = [
      '.navbar-center a',           // All main nav links
      '.navbar-right a',            // User profile, logout, etc.
      '.navbar-mobile-menu a',      // Mobile nav links
      '.announcement-btn',          // Announcement button (if it has this class or id)
      '#userProfileBtn',            // User profile button (if it has this id)
      '.prof',                      // Profile nav buttons
      '.nav-btn'                    // Mobile nav buttons
    ];
    navSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          Swal.fire({
            icon: 'warning',
            title: 'You need to log in first',
            text: 'Please log in to access this feature.',
            confirmButtonText: 'OK'
          });
        });
      });
    });
  }

  // KK Profile Navigation
function handleKKProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=KK%20Profiling`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/kkprofiling/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "KK Profiling";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileRes.ok && profileData && profileData._id;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have a ${formName} profile. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/kkcofirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already answered ${formName} Form`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/kkcofirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "/Frontend/html/user/kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "/Frontend/html/user/kkform-personal.html");
}

// LGBTQ+ Profile Navigation
function handleLGBTQProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=LGBTQIA%2B%20Profiling`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/lgbtqprofiling/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileData && profileData._id ? true : false;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have a ${formName} profile. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/lgbtqconfirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already answered ${formName} Form`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/lgbtqconfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "/Frontend/html/user/lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "/Frontend/html/user/lgbtqform.html");
}

// Educational Assistance Navigation
async function handleEducAssistanceNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'You need to log in first',
      text: 'Please log in to access Educational Assistance.',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return;
  }

  // Check if the user's latest application was rejected
  try {
    const checkRes = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.rejected && checkData.applicationId) {
        // Prompt user to edit/resubmit
        const result = await Swal.fire({
          icon: 'error',
          title: 'Application Rejected',
          html: `
            <div>
              <p>Your Educational Assistance application was rejected.</p>
              <p>Reason: <b>${checkData.rejectionReason || "No reason provided"}</b></p>
              <p>You may edit and resubmit your application.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Edit & Resubmit",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#07B0F2",
          cancelButtonColor: "#0A2C59"
        });
        if (result.isConfirmed) {
          window.location.href = `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${checkData.applicationId}`;
          return;
        }
        // If cancelled, do nothing
        return;
      }
    }
  } catch (err) {
    console.error('Error checking rejected application:', err);
    // fallback to normal flow
  }

  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=Educational%20Assistance`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "Educational Assistance";
    const isFormOpen = latestCycle?.isOpen ?? false;
    // consider a profile 'present' but also check for explicit rejection markers
    const hasProfile = profileData && profileData._id ? true : false;
    const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
    const isRejected = Boolean(
      (profileData && (profileData.rejected === true || profileData.isRejected === true)) ||
      (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal))
    );
    const isApproved = Boolean(
      (profileData && (profileData.status === 'approved' || profileData.approved === true)) ||
      (typeof statusVal === 'string' && /approve|approved/i.test(statusVal))
    );
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile && isApproved) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have an application. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile OR their previous application was rejected
    if (!isFormOpen && (!hasProfile || isRejected)) {
      // When the form is closed and there is no profile or it was rejected, inform the user they cannot submit now.
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new application at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile && isApproved) {
      Swal.fire({
        title: `You already applied for ${formName}`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile OR profile exists but was rejected → prompt to reapply
    if (isFormOpen && (!hasProfile || isRejected)) {
      if (isRejected) {
        // When their previous application was rejected, inform and immediately redirect to the form to reapply
        Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the resubmission page.' }).then(() => {
          try { sessionStorage.removeItem('educDraft'); sessionStorage.removeItem('educationalDraft'); sessionStorage.removeItem('educAssistanceDraft'); } catch (e) {}
          window.location.href = "/Frontend/html/user/confirmation/html/editEducRejected.html";
        });
      } else {
        const message = `You don't have a profile yet. Please fill out the form to create one.`;
        Swal.fire({
          icon: "info",
          title: 'No profile found',
          text: message,
          showCancelButton: true,
          confirmButtonText: "Go to form",
          cancelButtonText: "No",
        }).then(result => {
          if (result.isConfirmed) {
            try { sessionStorage.removeItem('educDraft'); sessionStorage.removeItem('educationalDraft'); sessionStorage.removeItem('educAssistanceDraft'); } catch (e) {}
            window.location.href = "/Frontend/html/user/Educational-assistance-user.html";
          }
        });
      }
      return;
    }
  })
  .catch(() => window.location.href = "/Frontend/html/user/Educational-assistance-user.html");
}

// ✅ Attach event listeners properly
  const kkProfileNavBtn = document.querySelector('.navbar-center a[href="./kkform-personal.html"]');
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');

  if (kkProfileNavBtn) {
    kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  // Attach to desktop nav button
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }
  // Attach to mobile nav button
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }

  // Replace previous educational-assistance attach logic with a single reliable handler
(function attachEducReapplyHandler() {
  const desktopBtn = document.getElementById('educAssistanceNavBtnDesktop');
  const mobileBtn = document.getElementById('educAssistanceNavBtnMobile');

  async function onEducClick(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    // If not logged in, delegate to existing handler (which will show login)
    if (!token) return handleEducAssistanceNavClick(e);

    // Try check-rejected first
    try {
      const res = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && json.rejected && json.applicationId) {
          const reason = json.rejectionReason || 'No reason provided';
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Application Rejected',
            html: `<p>Your Educational Assistance application was rejected.</p><p><strong>Reason:</strong> ${reason}</p><p>Do you want to edit and resubmit?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Edit & Resubmit',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#07B0F2',
            cancelButtonColor: '#0A2C59'
          });
          if (result.isConfirmed) {
            // Redirect to resubmit page with id
            window.location.href = `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${json.applicationId}`;
            return;
          }
          // user cancelled; do nothing
          return;
        }
      }
    } catch (err) {
      console.debug('check-rejected failed', err);
      // fallthrough to normal behavior
    }

    // If not rejected or check failed, proceed with normal flow
    handleEducAssistanceNavClick(e);
  }

  if (desktopBtn) desktopBtn.addEventListener('click', onEducClick);
  if (mobileBtn) mobileBtn.addEventListener('click', onEducClick);
})();
  
document.addEventListener('DOMContentLoaded', function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const verificationStrip = document.getElementById('verification-strip');

  if (token) {
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        if (!user.isVerified) {
          // Show verification strip for unverified accounts
          if (verificationStrip) {
            verificationStrip.style.display = 'flex';
          }

          // Disable navigation buttons
          const navSelectors = [
            '#kkProfileNavBtnDesktop',
            '#kkProfileNavBtnMobile',
            '#lgbtqProfileNavBtnDesktop',
            '#lgbtqProfileNavBtnMobile',
            '#educAssistanceNavBtnDesktop',
            '#educAssistanceNavBtnMobile',
            '.announcement-btn'
          ];
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
              btn.classList.add('disabled');
              btn.setAttribute('tabindex', '-1');
              btn.setAttribute('aria-disabled', 'true');
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                Swal.fire({
                  icon: 'warning',
                  title: 'Account Verification Required',
                  text: 'Please verify your account to access this feature.',
                  confirmButtonText: 'OK'
                });
              });
            });
          });
        }
      })
      .catch(() => {
        console.error('Failed to fetch user verification status.');
      });
  }
});
});