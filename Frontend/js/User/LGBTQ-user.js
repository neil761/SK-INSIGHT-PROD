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

  const hamburger = document.getElementById("navbarHamburger");
  const mobileMenu = document.getElementById("navbarMobileMenu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle("active");
    });
    document.addEventListener("click", function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove("active");
      }
    });
  }
});
