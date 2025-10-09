document.addEventListener('DOMContentLoaded', function() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  hamburger.addEventListener('click', function() {
    mobileMenu.classList.toggle('active');
  });
  document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });
});

  // Fetch both form cycle status and user profile
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/kk', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/kkprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
.then(async ([cycleRes, profileRes]) => {
  const cycleData = await cycleRes.json().catch(() => null);
  const profileData = await profileRes.json().catch(() => ({}));

  // ✅ Handle both array and object response types
  const latestCycle = Array.isArray(cycleData)
    ? cycleData[cycleData.length - 1]
    : cycleData;

  const formName = latestCycle?.formName || "KK Profiling";
  const isFormOpen = latestCycle?.isOpen ?? false; // ✅ default to false, not true
  const hasProfile = profileRes.ok && profileData && profileData._id;


      // 🔹 CASE 1: Form closed, user already has profile
      if (!isFormOpen && hasProfile) {
        Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `but you already have a ${formName} profile. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/kkconfirmation.html";
          }
        });
        return;
      }

      // 🔹 CASE 2: Form closed, user has NO profile
      if (!isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new response at this time.",
          confirmButtonText: "OK"
        });
        return;
      }

      // 🔹 CASE 3: Form open, user already has a profile
      if (isFormOpen && hasProfile) {
        Swal.fire({
          title: `You already answered ${formName} Form`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/kkconfirmation.html";
          }
        });
        return;
      }

      // 🔹 CASE 4: Form open, no profile → Go to form
      window.location.href = "kkform-personal.html";
    })
    .catch(err => {
      console.error("Error checking form status or profile:", err);
      window.location.href = "kkform-personal.html";
    });

function handleLGBTQProfileNavClick(event) {
  event.preventDefault();

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'You need to log in first',
      text: 'Please log in to access LGBTQ+ Profiling.',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return;
  }

  // Fetch both form cycle status and user profile
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=LGBTQIA+%20Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/lgbtqprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    const cycleData = await cycleRes.json().catch(() => null);
    const profileData = await profileRes.json().catch(() => ({}));

    const formName = cycleData?.formName || "LGBTQIA+ Profiling";
    const isFormOpen = cycleData?.isOpen ?? false;
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
        if (result.isConfirmed) {
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        }
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
        if (result.isConfirmed) {
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        }
      });
      return;
    }

    // CASE 4: Form open, no profile → Go to form
    window.location.href = "lgbtqform.html";
  })
  .catch(err => {
    console.error("Error checking form status or profile:", err);
    window.location.href = "lgbtqform.html";
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Attach to desktop nav button
  const kkProfileNavBtnDesktop = document.getElementById('kkProfileNavBtnDesktop');
  if (kkProfileNavBtnDesktop) {
    kkProfileNavBtnDesktop.addEventListener('click', handleKKProfileNavClick);
  }
  const kkProfileNavBtn = document.getElementById('kkProfileNavBtn');
  if (kkProfileNavBtn) {
    kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);
  }
  // Attach to mobile nav button
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');
  if (kkProfileNavBtnMobile) {
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
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
});