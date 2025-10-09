document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('youthAgeGroup').value = data.youthAgeGroup || '';
    document.getElementById('youthClassification').value = data.youthClassification || '';
    document.getElementById('educationalBackground').value = data.educationalBackground || '';
    document.getElementById('workStatus').value = data.workStatus || '';
    document.getElementById('registeredSKVoter').checked = !!data.registeredSKVoter;
    document.getElementById('registeredNationalVoter').checked = !!data.registeredNationalVoter;
    document.getElementById('votedLastSKElection').checked = !!data.votedLastSKElection;
    document.getElementById('attendedKKAssembly').checked = !!data.attendedKKAssembly;
    document.getElementById('attendanceCount').value = data.attendanceCount || '';
    document.getElementById('reasonDidNotAttend').value = data.reasonDidNotAttend || '';

    // Profile image preview (if exists)
    if (data.profileImage) {
      const imageUrl = data.profileImage.startsWith('http')
        ? data.profileImage
        : `http://localhost:5000/profile_images/${data.profileImage}`;
      document.getElementById('imagePreview').innerHTML =
        `<img src="${imageUrl}" alt="Profile Image" style="width:520px;border-radius:10px;">`;
    }
  } catch (err) {
    console.error('Failed to fetch KKProfile data:', err);
  }
  // Hamburger menu code
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("hamburger clicked");
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }
});

// =========================
// NAVBAR & KK PROFILING SECTION
// =========================
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  if (hamburger && mobileMenu) {
    console.log('✅ Navbar loaded');
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

  // ✅ KK Profile click handler
  async function handleKKProfileNavClick(event) {
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

    try {
      console.log("📡 Fetching profile...");
      const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📩 Response status:", res.status);

      if (res.status === 404) {
        const data = await res.json();
        console.log("ℹ️ No KK profile yet:", data);
        if (data.error === "You have not submitted a KK profile yet for the current cycle.") {
          window.location.href = "kkform-personal.html";
          return;
        }
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
    } catch (error) {
      console.error('🔥 Fetch error:', error);
      window.location.href = "kkform-personal.html";
    }
  }

  // ✅ Attach event listeners to both nav links
  const kkProfileNavBtn = document.querySelector('.navbar-center a[href="./kkform-personal.html"]');
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');

  if (kkProfileNavBtn) {
    console.log("✅ Desktop KK Profile button found");
    kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    console.log("✅ Mobile KK Profile button found");
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  // ✅ LGBTQ Profile click handler
  async function handleLGBTQProfileNavClick(event) {
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

    fetch('http://localhost:5000/api/lgbtqprofiling/me/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 404) {
          return res.json().then(data => {
            if (data.error === "You have not submitted an LGBTQ+ profile yet for the current cycle.") {
              window.location.href = "lgbtqform.html";
              return;
            }
          });
        }
        if (res.ok) {
          Swal.fire({
            title: "You already answered LGBTQ+ Profiling Form",
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
        } else {
          window.location.href = "lgbtqform.html";
        }
      })
      .catch(() => {
        window.location.href = "lgbtqform.html";
      });
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
