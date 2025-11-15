import { setupVerifyEmail } from './verify-email.js';

// Token validation helper function

document.addEventListener("DOMContentLoaded", function () {
  // OTP lockout check on page load
  const unlockAt = localStorage.getItem('otpLockoutUntil');
  if (unlockAt && Date.now() < unlockAt) {
    const seconds = Math.ceil((Number(unlockAt) - Date.now()) / 1000);
    showOtpLockoutModal(Number(unlockAt));
    disableVerifyBtn(seconds);
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  let user = null; // keep user data so we can use birthday later
  let otpLockoutUntil = null;
  let verificationOtpLockoutUntil = null;

  // --- Apply stored verification OTP lockout ---
  const storedLockout = localStorage.getItem('verificationOtpLockoutUntil');
  if (storedLockout && Date.now() < Number(storedLockout)) {
    window.verificationOtpLockoutUntil = Number(storedLockout);
    updateVerificationOtpButtons();
    if (window.verificationOtpInterval) clearInterval(window.verificationOtpInterval);
    window.verificationOtpInterval = setInterval(() => {
      updateVerificationOtpButtons();
      if (!window.verificationOtpLockoutUntil || Date.now() >= window.verificationOtpLockoutUntil) {
        clearInterval(window.verificationOtpInterval);
        window.verificationOtpInterval = null;
        localStorage.removeItem('verificationOtpLockoutUntil');
      }
    }, 1000);
  }

  const changeEmailLockout = localStorage.getItem('changeEmailOtpLockoutUntil');
  if (changeEmailLockout && Date.now() < Number(changeEmailLockout)) {
    otpLockoutUntil = Number(changeEmailLockout);
    updateOtpSendButtons();
    const interval = setInterval(() => {
      updateOtpSendButtons();
      if (Date.now() >= otpLockoutUntil) {
        clearInterval(interval);
        otpLockoutUntil = null;
        localStorage.removeItem('changeEmailOtpLockoutUntil');
        updateOtpSendButtons();
      }
    }, 1000);
  }

  // Fetch User Info
  (async function () {
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      user = await res.json();

      // Username
      const usernameElem = document.querySelector(".profile-container h3");
      if (usernameElem) {
        usernameElem.textContent = user.username || "";
      }

      // Email
      const emailElem = document.querySelector(".profile-container p");
      if (emailElem) {
        emailElem.textContent = user.email || "";
      }

      // Verified status
      const verifiedElem = document.querySelector(".profile-container .verified");
      if (verifiedElem) {
        if (user.isVerified) {
          verifiedElem.innerHTML = `Verified <i class="fa-solid fa-circle-check" style="color: #4caf50"></i>`;
        } else {
          verifiedElem.innerHTML = `Not Verified <i class="fa-solid fa-circle-check" style="color: #d4d4d4"></i>`;
        }
      }

      // Birthday input (from User)
      const birthdayInput = document.getElementById("birthday");
      if (birthdayInput && user.birthday) {
        birthdayInput.value = user.birthday.split("T")[0]; // format yyyy-mm-dd
        birthdayInput.readOnly = true;
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not fetch user profile. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }

    // Helper: set input value
    function setValue(id, value) {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    }

    // Helper: calculate age from birthday
    function calculateAge(birthday) {
      if (!birthday) return "";
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    // Fetch KKProfile Data (Full Name, Gender, etc.)
    try {
      const kkRes = await fetch("http://localhost:5000/api/kkprofiling/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kkRes.ok) {
        const kkProfile = await kkRes.json();

        // Construct full name: firstname middle initial lastname
        const middleInitial = kkProfile.middlename
          ? kkProfile.middlename.charAt(0).toUpperCase() + "."
          : "";
        const fullName = [
          kkProfile.firstname || "",
          middleInitial,
          kkProfile.lastname || ""
        ]
          .filter(Boolean)
          .join(" ");
        setValue("fullName", fullName);

        // ✅ Age comes from User's birthday
        if (user && user.birthday) {
          setValue("age", calculateAge(user.birthday));
        }

        setValue("gender", kkProfile.gender);
        setValue("youthClassification", kkProfile.youthClassification);
        setValue("civilStatus", kkProfile.civilStatus);
        setValue("purok", kkProfile.purok);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not fetch user profile. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }

    // Fetch profile image
    try {
      const imgRes = await fetch("http://localhost:5000/api/kkprofiling/me/image", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profileImg = document.getElementById("profile-img");
      if (imgRes.ok) {
        const { imageUrl } = await imgRes.json();
        if (profileImg) {
          if (imageUrl) {
            profileImg.src = imageUrl.startsWith("http") ? imageUrl : `http://localhost:5000/${imageUrl}`;
          } else {
            // No KK profile image, use default
            profileImg.src = "../../assets/default-profile.jpg";
          }
        }
      } else if (profileImg) {
        // No KK profile yet, use default
        profileImg.src = "../../assets/default-profile.jpg";
      }
    } catch (err) {
      const profileImg = document.getElementById("profile-img");
      if (profileImg) {
        profileImg.src = "../../assets/default-profile.jpg";
      }
    }

    // --- INITIALIZATION --- (moved here, after DOM/user is ready)
    const unverifiedEmailSection = document.getElementById("unverifiedEmailSection");
    const changeEmailForm = document.getElementById("changeEmailForm");

    if (user && !user.isVerified) {
      if (unverifiedEmailSection) unverifiedEmailSection.style.display = "";
      if (changeEmailForm) changeEmailForm.style.display = "none";
    } else {
      if (unverifiedEmailSection) unverifiedEmailSection.style.display = "none";
      if (changeEmailForm) changeEmailForm.style.display = "";
    }

    // Add the event handler for unverified email change here:
    const unverifiedChangeEmailBtn = document.getElementById("unverifiedChangeEmailBtn");
    if (unverifiedChangeEmailBtn) {
      unverifiedChangeEmailBtn.addEventListener("click", async function () {
        const newEmail = document.getElementById("unverifiedNewEmailInput").value?.trim();
        if (!newEmail) {
          Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid new email.", confirmButtonColor: "#0A2C59" });
          return;
        }
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        try {
          const res = await fetch("http://localhost:5000/api/users/change-email/unverified", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ newEmail })
          });
          const data = await res.json();
          if (!res.ok) {
            Swal.fire({ icon: "error", title: "Change Failed", text: data.message || "Failed to change email.", confirmButtonColor: "#0A2C59" });
            return;
          }
          Swal.fire({ icon: "success", title: "Email Changed", text: "Your email has been updated.", confirmButtonColor: "#0A2C59" }).then(() => {
            document.getElementById("settingsModal").classList.remove("active");
            window.location.reload();
          });
        } catch (err) {
          Swal.fire({ icon: "error", title: "Server Error", text: "Could not change email. Please try again.", confirmButtonColor: "#0A2C59" });
        }
      });
    }

    // ✅ Use the new modular verify email logic
    setupVerifyEmail(user);

    // --- Place all code that references changeEmailForm below its initialization ---
    // For example, your changeEmailForm submit handler:
    if (changeEmailForm) {
      changeEmailForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const currentEmail = document.getElementById("currentEmail").value;
        const newEmail = document.getElementById("newEmailInput").value?.trim();
        const confirmEmail = document.getElementById("confirmNewEmailInput").value?.trim();
        if (newEmail !== confirmEmail) {
          Swal.fire({
            icon: "error",
            title: "Email Mismatch",
            text: "New emails do not match.",
            confirmButtonColor: "#0A2C59"
          });
          return;
        }
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        try {
          const res = await fetch("http://localhost:5000/api/users/change-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ currentEmail, newEmail })
          });
          const data = await res.json();
          if (res.ok) {
            Swal.fire({
              icon: "success",
              title: "Email Changed",
              text: "Your email has been updated. Please verify your new email.",
              confirmButtonColor: "#0A2C59"
            }).then(() => {
              document.getElementById("settingsModal").classList.remove("active");
              window.location.reload();
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Change Failed",
              text: data.message || "Failed to change email.",
              confirmButtonColor: "#0A2C59"
            });
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Server Error",
            text: "Could not change email. Please try again.",
            confirmButtonColor: "#0A2C59"
          });
        }
      });
    }

    // Place any other logic that uses changeEmailForm here.

  })();

  // Move this to the top, before updateOtpSendButtons and before any usage:
  const sendEmailOtpBtn = document.getElementById("sendEmailOtpBtn");

  function updateOtpSendButtons() {
    sendEmailOtpBtn.disabled = false;
    const now = Date.now();
    if (otpLockoutUntil && now < otpLockoutUntil) {
      sendEmailOtpBtn.disabled = true;
      if (resendAnchor) resendAnchor.style.pointerEvents = "none";
      const left = Math.ceil((otpLockoutUntil - now) / 1000);
      const m = Math.floor(left / 60);
      const s = left % 60;
      sendEmailOtpBtn.textContent = `Send OTP (${m}:${s.toString().padStart(2, "0")})`;
      if (resendAnchor) resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
    } else {
      sendEmailOtpBtn.disabled = false;
      sendEmailOtpBtn.textContent = "Send OTP";
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
      }
    }
  }

  function updateVerificationOtpButtons() {
    const now = Date.now();
    const verifyBtn = document.querySelector('.verify-btn');
    const resendAnchor = document.getElementById('verificationResendOtp');
    if (verificationOtpLockoutUntil && now < verificationOtpLockoutUntil) {
      const left = Math.ceil((verificationOtpLockoutUntil - now) / 1000);
      const m = Math.floor(left / 60);
      const s = left % 60;
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = `Verify Account (${m}:${s.toString().padStart(2, "0")})`;
      }
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "none";
        resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
      }
    } else {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify Account";
      }
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
      }
    }
  }

  // Call this after every OTP send or on modal open
  async function checkOtpSendLockout() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (
          user.emailChangeOtpSendWindowStart &&
          user.emailChangeOtpSendCount >= 2 &&
          Date.now() - user.emailChangeOtpSendWindowStart < 2 * 60 * 1000
        ) {
          otpLockoutUntil = user.emailChangeOtpSendWindowStart + 2 * 60 * 1000;
          localStorage.setItem('changeEmailOtpLockoutUntil', otpLockoutUntil);
          updateOtpSendButtons();
          // Start timer only if backend says so
          const interval = setInterval(() => {
            updateOtpSendButtons();
            if (Date.now() >= otpLockoutUntil) {
              clearInterval(interval);
              otpLockoutUntil = null;
              localStorage.removeItem('changeEmailOtpLockoutUntil');
              updateOtpSendButtons();
            }
          }, 1000);
        } else {
          otpLockoutUntil = null;
          localStorage.removeItem('changeEmailOtpLockoutUntil');
          updateOtpSendButtons();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  async function checkVerificationOtpLockout(email) {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (
          user.emailVerificationOtpSendWindowStart &&
          user.emailVerificationOtpSendCount >= 2 &&
          Date.now() - user.emailVerificationOtpSendWindowStart < 2 * 60 * 1000
        ) {
          verificationOtpLockoutUntil = user.emailVerificationOtpSendWindowStart + 2 * 60 * 1000;
          setVerificationLockout(verificationOtpLockoutUntil); // <-- persist lockout
          updateVerificationOtpButtons();
          if (window.verificationOtpInterval) clearInterval(window.verificationOtpInterval);
          window.verificationOtpInterval = setInterval(() => {
            updateVerificationOtpButtons();
            if (!verificationOtpLockoutUntil || Date.now() >= verificationOtpLockoutUntil) {
              clearInterval(window.verificationOtpInterval);
              window.verificationOtpInterval = null;
              clearVerificationLockout(); // clear when done
            }
          }, 1000);
        } else {
          verificationOtpLockoutUntil = null;
          updateVerificationOtpButtons();
          if (window.verificationOtpInterval) {
            clearInterval(window.verificationOtpInterval);
            window.verificationOtpInterval = null;
          }
          clearVerificationLockout(); // clear if no lockout
        }
      }
    } catch (err) {
      // ignore
    }
  }

  // Logout button functionality
  const logoutBtn = document.querySelector('.logout-btn');
  // ...existing code...
if (logoutBtn) {
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    Swal.fire({
      title: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear(); // <-- clear all local storage
        sessionStorage.removeItem('token');
        window.location.href = './index.html'; // Adjust path if needed
      }
    });
  });
}
// ...existing code...

  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // --- SETTINGS ICON & MODAL ---
  const settingsIcon = document.getElementById("settingsIcon");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.querySelector(".close-settings");
  const tabs = document.querySelectorAll(".settings-tab");
  const tabContents = {
    password: document.getElementById("settingsTabPassword"),
    email: document.getElementById("settingsTabEmail")
  };

  // Open modal
  settingsIcon.addEventListener("click", () => {
    settingsModal.classList.add("active");
    document.getElementById("currentEmail").value =
      document.querySelector(".profile-container p").textContent || "";
    checkResendLockoutOnOpen();
    checkOtpSendLockout();
  });

  // Close modal
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
    resetSettingsModal();
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(tabContents).forEach(c => (c.style.display = "none"));
      tabContents[tab.dataset.tab].style.display = "";
    });
  });

  // --- Change Password ---
  document.getElementById("changePasswordForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;
    if (newPassword !== confirmNewPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New passwords do not match.",
        confirmButtonColor: "#0A2C59"
      });
      return;
    }
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Password Changed",
          text: "Your password has been updated.",
          confirmButtonColor: "#0A2C59"
        });
        settingsModal.classList.remove("active");
        resetSettingsModal();
      } else {
        Swal.fire({
          icon: "error",
          title: "Change Failed",
          text: data.message || "Failed to change password.",
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not change password. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }
  });

  // --- Change Email ---
  const emailOtpSection = document.getElementById("emailOtpSection");
  const verifyEmailOtpBtn = document.getElementById("verifyEmailOtpBtn");
  const newEmailSection = document.getElementById("newEmailSection");
  const verifyResendInfo = document.getElementById("verifyResendInfo");

  let otpVerifiedForChange = false;
  let verifiedOtpValue = null;
  let otpTimerInterval = null;
  let otpExpiresAt = null;

  // Resend control: allow one immediate resend, then lock for 2 minutes
  let resendRemaining = 1;
  let resendLockUntil = null;
  let resendTimerInterval = null;
  const resendWrapper = document.getElementById("resendOtpLink");
  const resendAnchor = document.getElementById("changeResendOtp") || resendWrapper?.querySelector("a");
  const changeResendInfo = document.getElementById("changeResendInfo");

  function setResendVisible(visible) {
    if (!resendWrapper) return;
    resendWrapper.style.display = visible ? "" : "none";
  }

  function startResendCooldown(ms) {
    resendLockUntil = Date.now() + ms;
    if (resendAnchor) {
      resendAnchor.style.pointerEvents = "none";
    }
    updateResendCountdown();
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    resendTimerInterval = setInterval(() => {
      updateResendCountdown();
    }, 1000);
  }

  function updateResendCountdown() {
    if (!resendWrapper) return;
    const now = Date.now();
    if (!resendLockUntil || now >= resendLockUntil) {
      if (resendTimerInterval) {
        clearInterval(resendTimerInterval);
        resendTimerInterval = null;
      }
      resendLockUntil = null;
      resendRemaining = 1;
      if (resendAnchor) {
        resendAnchor.textContent = "Resend OTP";
        resendAnchor.style.pointerEvents = "";
      }
      return;
    }
    const left = Math.ceil((resendLockUntil - now) / 1000);
    const m = Math.floor(left / 60);
    const s = left % 60;
    if (resendAnchor) resendAnchor.textContent = `Resend in ${m}:${s.toString().padStart(2, "0")}`;
  }

  // When OTP is sent
  sendEmailOtpBtn.addEventListener("click", async function () {
    const currentEmail = document.getElementById("currentEmail").value;

    // ✅ Always fetch latest user data
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    let userData;
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        userData = await res.json();
      }
    } catch (err) {
      userData = null;
    }
    const isVerified = userData && userData.isVerified;

    if (isVerified) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Change Verified Email?",
        html: "Are you sure you want to change your email? Your current email is already verified.<br><br><b>Note:</b> Changing your email will require you to re-verify your new email address.",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0A2C59"
      });
      if (!result.isConfirmed) {
        sendEmailOtpBtn.disabled = false;
        return;
      }
    }

    sendEmailOtpBtn.disabled = true;
    Swal.fire({
      title: "Sending OTP...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch("http://localhost:5000/api/users/change-email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });

      let data;
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        data = { message: raw };
      }
      Swal.close();

      if (res.ok) {
        // Only reset UI on success
        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: "Check your email for the OTP code.",
          confirmButtonColor: "#0A2C59"
        });
        // Hide current email input
        const currentEmailInput = document.getElementById("currentEmail");
        if (currentEmailInput) currentEmailInput.style.display = "none";

        // Hide ONLY the "Current Verified Email" label
        const emailForm = document.getElementById("changeEmailForm");
        if (emailForm) {
          const labels = emailForm.querySelectorAll("label");
          labels.forEach(label => {
            if (label.textContent.trim() === "Current Verified Email") {
              label.style.display = "none";
            }
          });
        }

        // Hide Send OTP button
        sendEmailOtpBtn.style.display = "none";

        // Show OTP section
        emailOtpSection.style.display = "";

        // Hide verified badge so only OTP UI shows
        const modalVerified = document.querySelector("#settingsModal .verified");
        if (modalVerified) modalVerified.style.display = "none";

        otpExpiresAt = Date.now() + 10 * 60 * 1000;
        startEmailOtpTimer();
        setupOtpInputs();
        resendRemaining = 1;
        setResendVisible(true);
        if (resendAnchor) {
          resendAnchor.textContent = "Resend OTP";
          resendAnchor.style.pointerEvents = "";
          resendAnchor.style.display = "";
        }
        if (verifyResendInfo) verifyResendInfo.style.display = "none";
      } else {
        // show info area; only permanently remove resend if server returns 429 (too many requests)
        if (changeResendInfo) changeResendInfo.style.display = "";

        if (res.status === 429) {
          // backend lockout -> hide resend link and show message (same behavior as verify-email)
          if (resendAnchor) resendAnchor.style.display = "none";
          if (changeResendInfo) changeResendInfo.textContent = data.message || "Too many OTP requests. Please wait 2 minutes.";
        } else {
          if (resendAnchor) {
            resendAnchor.style.display = "";
            resendAnchor.style.pointerEvents = "";
          }
        }

        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text: data.message || "Failed to send OTP.",
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.close();
      // network error: keep resend visible so user can try again
      if (changeResendInfo) changeResendInfo.style.display = "";
      if (resendAnchor) {
        resendAnchor.style.display = "";
        resendAnchor.style.pointerEvents = "";
      }
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not send OTP. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    } finally {
      // ensure button re-enabled if not hidden
      if (sendEmailOtpBtn && sendEmailOtpBtn.style.display !== "none") {
        sendEmailOtpBtn.disabled = false;
      }
    }
  });

  // Verify OTP (new behaviour: verify then reveal new-email form)
  verifyEmailOtpBtn.addEventListener("click", async function () {
    const otp = Array.from(document.querySelectorAll("#emailOtpInputs .otp-input"))
      .map(input => input.value)
      .join("");
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      Swal.fire({ icon: "error", title: "Invalid OTP", text: "Please enter the 6-digit OTP.", confirmButtonColor: "#0A2C59" });
      return;
    }
    verifyEmailOtpBtn.disabled = true;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/change-email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp })
      });
      const data = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : Promise.resolve({ message: await res.text() }));
      if (!res.ok) {
        Swal.fire({ icon: "error", title: "Verification Failed", text: data.message || "Invalid or expired OTP.", confirmButtonColor: "#0A2C59" });
        verifyEmailOtpBtn.disabled = false;
        return;
      }
      // success: reveal new email input
      otpVerifiedForChange = true;
      verifiedOtpValue = otp;
      emailOtpSection.style.display = "none";
      newEmailSection.style.display = "";
      Swal.fire({ icon: "success", title: "OTP Verified", text: "You may now enter a new email address.", confirmButtonColor: "#0A2C59" });
    } catch (err) {
      console.error("Change-email verify error:", err);
      Swal.fire({ icon: "error", title: "Server Error", text: "Could not verify OTP. Please try again.", confirmButtonColor: "#0A2C59" });
      verifyEmailOtpBtn.disabled = false;
    }
  });

  // Submit change email form
  changeEmailForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!otpVerifiedForChange) {
      Swal.fire({ icon: "warning", title: "OTP Required", text: "Please verify the OTP first.", confirmButtonColor: "#0A2C59" });
      return;
    }
    const newEmail = document.getElementById("newEmailInput").value?.trim();
    if (!newEmail) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid new email.", confirmButtonColor: "#0A2C59" });
      return;
    }
    verifyEmailOtpBtn.disabled = true;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail, otp: verifiedOtpValue })
      });
      const data = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : Promise.resolve({ message: await res.text() }));
      if (!res.ok) {
        Swal.fire({ icon: "error", title: "Change Failed", text: data.message || "Failed to change email.", confirmButtonColor: "#0A2C59" });
        verifyEmailOtpBtn.disabled = false;
        // Do NOT reload or reset modal here
        return;
      }
      Swal.fire({ icon: "success", title: "Email Changed", text: "Your email has been updated. Please verify your new email.", confirmButtonColor: "#0A2C59" }).then(() => {
        settingsModal.classList.remove("active");
        resetSettingsModal();
        window.location.reload();
      });
    } catch (err) {
      console.error("Change email submit error:", err);
      Swal.fire({ icon: "error", title: "Server Error", text: "Could not change email. Please try again.", confirmButtonColor: "#0A2C59" });
      verifyEmailOtpBtn.disabled = false;
      // Do NOT reload or reset modal here
    }
  });

  /**
   * Start email OTP countdown and update UI.
   * Uses otpExpiresAt and otpTimerInterval declared earlier.
   */
  function startEmailOtpTimer() {
    const timerEl = document.getElementById("emailOtpTimer");
    const resendWrapper = document.getElementById("resendOtpLink");
    const sendBtn = document.getElementById("sendEmailOtpBtn");

    // clear existing
    if (otpTimerInterval) {
      clearInterval(otpTimerInterval);
      otpTimerInterval = null;
    }

    if (!otpExpiresAt) {
      if (timerEl) timerEl.textContent = "";
      if (resendWrapper) resendWrapper.style.display = "";
      return;
    }

    // show timer but DO NOT permanently disable/hide the resend anchor here
    if (resendWrapper && resendAnchor) {
      // keep it visible; don't set pointerEvents to none so user can still click resend
      resendWrapper.style.display = "";
    }
    if (sendBtn) sendBtn.disabled = true;

    function update() {
      const msLeft = otpExpiresAt - Date.now();
      if (msLeft <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
        if (timerEl) timerEl.textContent = "OTP expired. You can resend.";
        if (resendWrapper && resendAnchor) {
          // allow clicking again after expiry
          resendAnchor.style.pointerEvents = "";
          resendAnchor.classList.remove('disabled');
        }
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
      const sec = Math.ceil(msLeft / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (timerEl) timerEl.textContent = `OTP expires in ${m}:${s.toString().padStart(2, "0")}`;
    }

    update();
    otpTimerInterval = setInterval(update, 1000);
  }

  /**
   * Render/setup six OTP input boxes inside #emailOtpInputs and wire focus behavior.
   * If container not present, creates one inside newEmailSection (if exists).
   */
  function setupOtpInputs() {
    let container = document.getElementById("emailOtpInputs");
    const newEmailSection = document.getElementById("newEmailSection");

    if (!container) {
      // create container and append to newEmailSection or settings modal
      container = document.createElement("div");
      container.id = "emailOtpInputs";
      container.style.display = "flex";
      container.style.gap = "8px";
      container.style.justifyContent = "center";
      if (newEmailSection) newEmailSection.appendChild(container);
      else document.body.appendChild(container);
    }

    container.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.className = "otp-input";
      input.style.width = "40px";
      input.style.fontSize = "1.5rem";
      input.style.textAlign = "center";
      input.autocomplete = "off";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";

      // Auto-advance on input
      input.addEventListener("input", function (e) {
        if (this.value.length === 1 && i < 5) {
          container.querySelectorAll(".otp-input")[i + 1].focus();
        }
        // Paste support: fill all boxes if 6 digits pasted
        if (e.inputType === "insertFromPaste") {
          const val = this.value;
          if (/^\d{6}$/.test(val)) {
            val.split("").forEach((digit, idx) => {
              container.querySelectorAll(".otp-input")[idx].value = digit;
            });
            container.querySelectorAll(".otp-input")[5].focus();
          }
        }
      });
      // Backspace: go to previous
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && this.value === "" && i > 0) {
          container.querySelectorAll(".otp-input")[i - 1].focus();
        }
      });
      container.appendChild(input);
    }
    container.querySelector(".otp-input").focus();
  }

  function resetSettingsModal() {
    document.getElementById("changePasswordForm").reset();
    document.getElementById("changeEmailForm").reset();
    emailOtpSection.style.display = "none";
    newEmailSection.style.display = "none";
    sendEmailOtpBtn.disabled = false;
    verifyEmailOtpBtn.disabled = false;
    otpVerifiedForChange = false; // <-- FIXED
    document.getElementById("currentEmail").style.display = "";
    // Restore ONLY the "Current Verified Email" label
    const emailForm = document.getElementById("changeEmailForm");
    if (emailForm) {
      const labels = emailForm.querySelectorAll("label");
      labels.forEach(label => {
        if (label.textContent.trim() === "Current Verified Email") {
          label.style.display = "";
        }
      });
    }
    tabs.forEach(t => t.classList.remove("active"));
    tabs[0].classList.add("active");
    Object.values(tabContents).forEach((c, i) => c.style.display = i === 0 ? "" : "none");
    document.getElementById("resendOtpLink").style.display = "none";
  }

  // --- Resend OTP logic ---
  function showResendTimer(secondsLeft) {
    let timerEl = document.getElementById("resendOtpTimer");
    if (!timerEl) {
      timerEl = document.createElement("div");
      timerEl.id = "resendOtpTimer";
      timerEl.style.color = "#0A2C59";
      timerEl.style.fontSize = "0.95rem";
      timerEl.style.textAlign = "center";
      resendWrapper.parentNode.insertBefore(timerEl, resendWrapper.nextSibling);
    }
    let left = secondsLeft;
    resendAnchor.style.pointerEvents = "none";
    resendAnchor.textContent = `Resend OTP (${Math.floor(left / 60)}:${(left % 60).toString().padStart(2, "0")})`;
    function update() {
      left--;
      if (left < 0) {
        clearInterval(window.resendOtpTimerInterval);
        timerEl.textContent = "";
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
        return;
      }
      const m = Math.floor(left / 60);
      const s = left % 60;
      timerEl.textContent = `Resend available in ${m}:${s.toString().padStart(2, "0")}`;
      resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
    }
    clearInterval(window.resendOtpTimerInterval);
    update();
    window.resendOtpTimerInterval = setInterval(update, 1000);
  }

  if (resendAnchor) {
    let hasResent = false; // Add this flag
    resendAnchor.addEventListener("click", async function (e) {
      e.preventDefault();
      // prevent double-click while request is in-flight
      if (hasResent) return;
      hasResent = true;
      resendAnchor.textContent = "Sending...";
      // temporarily block repeat clicks for this request
      resendAnchor.style.pointerEvents = "none";
      Swal.fire({
        title: "Sending OTP...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      try {
        const res = await fetch("http://localhost:5000/api/users/change-email/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
        const raw = await res.text();
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = { message: raw }; }
        Swal.close();

        // show info area; only permanently remove resend if server returns 429 (too many requests)
        if (changeResendInfo) changeResendInfo.style.display = "";

        if (res.status === 429) {
          // backend enforces lockout -> hide the link and show info (same UX as verify-email)
          if (resendAnchor) resendAnchor.style.display = "none";
          if (changeResendInfo) changeResendInfo.textContent = data.message || "Too many OTP requests. Please wait 2 minutes.";
          // keep hasResent true so user can't try again
        } else {
          // allow further resends after this request completes
          if (resendAnchor) {
            resendAnchor.style.display = "";
            resendAnchor.style.pointerEvents = "";
          }
          hasResent = false;
        }

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "OTP Sent",
            text: "Check your email for the OTP code.",
            confirmButtonColor: "#0A2C59"
          });
          otpExpiresAt = Date.now() + 10 * 60 * 1000;
          startEmailOtpTimer();
          setupOtpInputs();
        } else if (res.status !== 429) {
          Swal.fire({
            icon: "error",
            title: "Send Failed",
            text: data.message || "Failed to send OTP.",
            confirmButtonColor: "#0A2C59"
          });
        }
      } catch (err) {
        Swal.close();
        // network error: restore clickability so user can retry
        if (changeResendInfo) changeResendInfo.style.display = "";
        if (resendAnchor) {
          resendAnchor.style.pointerEvents = "";
        }
        hasResent = false;
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: "Could not send OTP. Please try again.",
          confirmButtonColor: "#0A2C59"
        });
      } finally {
        // restore text/pointer unless backend hidden the control (429 case)
        if (resendAnchor && resendAnchor.style.display !== "none") {
          resendAnchor.textContent = "Resend OTP";
          resendAnchor.style.pointerEvents = "";
          resendAnchor.classList.remove('disabled');
          if (changeResendInfo) changeResendInfo.style.display = "none";
        }
      }
    });
  }

  async function checkResendLockoutOnOpen() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
          const secondsLeft = Math.ceil((user.emailChangeOtpLockedUntil - Date.now()) / 1000);
          resendAnchor.style.pointerEvents = "none";
          showResendTimer(secondsLeft);
        } else {
          resendAnchor.style.pointerEvents = "";
          document.getElementById("resendOtpTimer")?.remove();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  function setVerificationLockout(untilTimestamp) {
    localStorage.setItem('verificationOtpLockoutUntil', untilTimestamp);
  }

  function clearVerificationLockout() {
    localStorage.removeItem('verificationOtpLockoutUntil');
  }

  // Connect to Socket.IO server
  const socket = io('http://localhost:5000'); // adjust port if needed

  // Join room for this user (use email or userId)
  const userEmail = user?.email; // get user's email from profile
  if (userEmail) {
    socket.emit('join', { email: userEmail });
  }

  // Listen for lockout events
  socket.on('otpLockout', (data) => {
    if (data.email !== userEmail) return; // Only update for this user

    let lockoutUntil = data.lockoutUntil;
    const verifyBtn = document.querySelector('.verify-btn');

    function updateBtnTimer() {
      const now = Date.now();
      if (now < lockoutUntil) {
        const left = Math.ceil((lockoutUntil - now) / 1000);
        const m = Math.floor(left / 60);
        const s = left % 60;
        verifyBtn.disabled = true;
        verifyBtn.textContent = `Verify Account (${m}:${s.toString().padStart(2, "0")})`;
      } else {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify Account";
        clearInterval(timerInterval);
      }
    }

    updateBtnTimer();
    const timerInterval = setInterval(updateBtnTimer, 1000);
  });
});
