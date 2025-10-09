document.addEventListener('DOMContentLoaded', function() {
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

// Add to the top of your user JS files (after DOMContentLoaded)
function handleKKProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'You need to log in first',
      text: 'Please log in to access KK Profiling.',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return;
  }

  fetch('http://localhost:5000/api/kkprofiling/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (res.status === 404) {
        return res.json().then(data => {
          if (data.error === "You have not submitted a KK profile yet for the current cycle.") {
            window.location.href = "kkform-personal.html";
            return;
          }
        });
      }
      if (res.ok) {
        Swal.fire({
          title: "You already answered KK Profiling Form",
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            window.location.href = "kkcofirmation.html";
          }
        });
      }
    })
    .catch(() => {
      window.location.href = "kkform-personal.html";
    });
}

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

  fetch('http://localhost:5000/api/lgbtqprofiling/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(async res => {
      const data = await res.json();
      // If profile exists (res.ok), go to confirmation
      if (res.ok && data && data._id) {
        window.location.href = "confirmation/html/lgbtqconfirmation.html";
        return;
      }
      // If no profile (404 or error), go to profiling form
      window.location.href = "lgbtqform.html";
    })
    .catch(() => {
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

  // Attach to desktop nav button for LGBTQ
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }
  // Attach to mobile nav button for LGBTQ
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }
});