document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ DOM fully loaded");

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
  }

  // ✅ Main handler
  function handleKKProfileNavClick(event) {
    event.preventDefault();
    console.log("🟢 KK Profile button clicked");

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
        console.log("📩 Response status:", res.status);

        if (res.status === 404) {
          return res.json().then(data => {
            console.log("ℹ️ No KK profile yet:", data);
            if (data.error === "You have not submitted a KK profile yet for the current cycle.") {
              window.location.href = "kkform-personal.html";
              return;
            }
          });
        }
        if (res.ok) {
          console.log("✅ Profile exists, showing SweetAlert...");
          Swal.fire({
            title: "You already answered KK Profiling Form",
            text: "Do you want to view your response?",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No"
          }).then(result => {
            if (result.isConfirmed) {
              console.log("➡️ Redirecting to confirmation page...");
              window.location.href = "confirmation/html/kkcofirmation.html";
            }
          });
        } else {
          console.log("❌ Not OK response, redirecting to form...");
          window.location.href = "kkform-personal.html";
        }
      })
      .catch(() => {
        window.location.href = "kkform-personal.html";
      });
  }

  // ✅ Attach event listeners properly
  const kkProfileNavBtnDesktop = document.getElementById('kkProfileNavBtnDesktop');
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');

  if (kkProfileNavBtnDesktop) {
    console.log("✅ Desktop KK Profile button found");
    kkProfileNavBtnDesktop.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    console.log("✅ Mobile KK Profile button found");
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  // LGBTQ+ Profile handler
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

  // Attach LGBTQ+ handlers to buttons
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');

  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }

  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }
});
