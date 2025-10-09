document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ LGBTQ-user.js loaded");

  const form = document.getElementById("lgbtqForm");
  const birthdayInput = document.getElementById("birthday");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) {
    console.error("❌ No form found!");
    return;
  }

  // Get token
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // Autofill birthday
  if (token && birthdayInput) {
    fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (user && user.birthday) {
          const d = new Date(user.birthday);
          birthdayInput.value = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      })
      .catch((err) => console.error("❌ Fetch me error:", err));
  }

  // ✅ Handle submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop auto refresh
    e.stopPropagation(); // extra safety
    console.log("👉 Custom submit handler triggered");

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Unauthorized",
        text: "No token found",
      });
      return;
    }

    // disable button
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const formData = new FormData(form);
      console.log("📦 FormData entries:", [...formData.entries()]);

      const res = await fetch("http://localhost:5000/api/lgbtqprofiling", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // let browser set multipart headers
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        console.log("✅ Submission success:", data);
        Swal.fire({
          icon: "success",
          title: "Profile submitted!",
          text: "Redirecting...",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
      } else {
        console.error("❌ Submission failed:", data);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong.",
        });
      }
    } catch (err) {
      console.error("❌ Exception:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Server error." });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });

  // Add to the top of your user JS files (after DOMContentLoaded)
  function handleKKProfileNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "You need to log in first",
        text: "Please log in to access KK Profiling.",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.href = "/Frontend/html/user/login.html";
      });
      return;
    }

    fetch("http://localhost:5000/api/kkprofiling/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) {
          return res.json().then((data) => {
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
            cancelButtonText: "No",
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = "confirmation/html/kkcofirmation.html";
            }
          });
        } else {
          window.location.href = "kkform-personal.html";
        }
      })
      .catch(() => {
        window.location.href = "kkform-personal.html";
      });
  }

  // Attach to desktop nav button
  const kkProfileNavBtnDesktop = document.getElementById("kkProfileNavBtnDesktop");
  if (kkProfileNavBtnDesktop) {
    kkProfileNavBtnDesktop.addEventListener("click", handleKKProfileNavClick);
  }
  // Attach to mobile nav button
  const kkProfileNavBtnMobile = document.getElementById("kkProfileNavBtnMobile");
  if (kkProfileNavBtnMobile) {
    kkProfileNavBtnMobile.addEventListener("click", handleKKProfileNavClick);
  }

  // Hamburger menu toggle
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      mobileMenu.classList.toggle('active');
    });
    // Optional: close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
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
