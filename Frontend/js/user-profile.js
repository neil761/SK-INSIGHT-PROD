// Token validation helper function
 

document.addEventListener("DOMContentLoaded", async () => {
  // OTP lockout check on page load
  const unlockAt = localStorage.getItem('otpLockoutUntil');
  if (unlockAt && Date.now() < unlockAt) {
    const seconds = Math.ceil((Number(unlockAt) - Date.now()) / 1000);
    showOtpLockoutModal(Number(unlockAt));
    disableVerifyBtn(seconds);
  }
  
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  let user = null; // keep user data so we can use birthday later

  // Fetch User Info
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
    console.error("Failed to fetch user profile:", err);
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
    console.error("Failed to fetch KKProfile data:", err);
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

  // Always enable the verify button for unverified users
  const verifyBtn = document.querySelector('.verify-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async function() {
      // Check if user is already verified
      if (user && user.isVerified) {
        Swal.fire({
          icon: 'info',
          title: 'Account Already Verified',
          text: 'Your account has already been verified.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0A2C59'
        });
        return;
      }

      // Step 1: Ask for email
      const { value: email } = await Swal.fire({
        title: 'Enter Your Email',
        input: 'email',
        inputLabel: 'Email Address',
        inputPlaceholder: 'Enter your email address',
        inputValue: user && user.email ? user.email : '',
        inputAttributes: {
          readonly: true
        },
        showCancelButton: true,
        confirmButtonText: 'Send OTP',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) return 'Please enter your email address';
        }
      });

      if (!email) return;

      // Step 2: Send OTP to backend
      let sendRes;
      try {
        // Show loading modal
        Swal.fire({
          title: 'Sending OTP...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        sendRes = await fetch('http://localhost:5000/api/users/verify/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const sendData = await sendRes.json();

        // Close loading modal
        Swal.close();

        if (!sendRes.ok) {
          Swal.fire('Error', sendData.message || 'Failed to send OTP', 'error');
          return;
        }
        Swal.fire('OTP Sent', 'Check your email for the OTP code.', 'success');
      } catch (err) {
        Swal.close();
        Swal.fire('Error', 'Failed to send OTP', 'error');
        return;
      }

      // Step 3: Ask for OTP
      const { value: otp } = await Swal.fire({
        title: 'Enter OTP',
        html: `
          <div style="display:flex;justify-content:center;gap:8px;">
            ${Array.from({length: 6}).map((_, i) =>
              `<input id="otp${i+1}" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;border-radius:8px;border:1px solid #0A2C59;background:#f7faff;box-shadow:0 2px 8px rgba(7,176,242,0.07);" autofocus>`
            ).join('')}
          </div>
          <div style="margin-top:12px;font-size:14px;color:#0A2C59;">Check your email for the 6-digit code.</div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Verify',
        cancelButtonText: 'Cancel',
        focusConfirm: false,
        customClass: {
          popup: 'otp-modal-popup'
        },
        didOpen: () => {
          // Auto-focus next input on input
          for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`otp${i}`);
            input.addEventListener('input', function() {
              if (this.value.length === 1 && i < 6) {
                document.getElementById(`otp${i + 1}`).focus();
              }
            });
            input.addEventListener('keydown', function(e) {
              if (e.key === 'Backspace' && this.value === '' && i > 1) {
                document.getElementById(`otp${i - 1}`).focus();
              }
            });
          }
          document.getElementById('otp1').focus();
        },
        preConfirm: async () => {
          const otp = [
            document.getElementById('otp1').value,
            document.getElementById('otp2').value,
            document.getElementById('otp3').value,
            document.getElementById('otp4').value,
            document.getElementById('otp5').value,
            document.getElementById('otp6').value
          ].join('');
          if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            Swal.showValidationMessage('Please enter the 6-digit OTP');
            return false;
          }
          const result = await verifyOtp(email, otp);
          return result;
        }
      });

      if (!otp) return;

      // Step 4: Verify OTP with backend
      async function verifyOtp(email, otp) {
        const verifyRes = await fetch('http://localhost:5000/api/users/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });

        if (verifyRes.ok) {
          await Swal.fire('Verified!', 'Your account has been verified.', 'success');
          window.location.reload();
          return true;
        } else if (verifyRes.status === 429) {
          const verifyData = await verifyRes.json();
          const unlockAt = Date.now() + (verifyData.secondsLeft ? verifyData.secondsLeft * 1000 : 5 * 60 * 1000);
          setUserLockout(email, unlockAt);

          showOtpLockoutModal(unlockAt, email);
          return false;
        } else {
          const verifyData = await verifyRes.json();
          Swal.showValidationMessage(verifyData.message || 'Invalid or expired OTP');
          return false;
        }
      }

      if (otp) {
        const isVerified = await verifyOtp(email, otp);
        if (isVerified) {
          Swal.fire('Verified!', 'Your account has been verified.', 'success').then(() => {
            window.location.reload();
          });
          return true;
        } else if (verifyRes.status === 429) {
          const verifyData = await verifyRes.json();
          const unlockAt = Date.now() + (verifyData.secondsLeft ? verifyData.secondsLeft * 1000 : 5 * 60 * 1000);
          setUserLockout(email, unlockAt);

          showOtpLockoutModal(unlockAt, email);
          return false;
        } else {
          const verifyData = await verifyRes.json();
          Swal.showValidationMessage(verifyData.message || 'Invalid or expired OTP');
          return false;
        }
      }

      if (otp) {
        const isVerified = await verifyOtp(email, otp);
        if (isVerified) {
          Swal.fire('Verified!', 'Your account has been verified.', 'success').then(() => {
            window.location.reload();
          });
        }
      }
    });
  }

  // Logout button functionality
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      Swal.fire({
        title: 'Are you sure you want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, log out',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = './index.html'; // Adjust path if needed
        }
      });
    });
  }

  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
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
  };
});

// KK Profile Navigation
function handleKKProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=KK%20Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/kkprofiling/me', {
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
        if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
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
        if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
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
          window.location.href = "kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "kkform-personal.html");
}

// LGBTQ+ Profile Navigation
function handleLGBTQProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=LGBTQIA%2B%20Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/lgbtqprofiling/me/profile', {
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
        if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
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
        if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
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
          window.location.href = "lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "lgbtqform.html");
}

// Educational Assistance Navigation
function handleEducAssistanceNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=Educational%20Assistance', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/educational-assistance/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "Educational Assistance";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileData && profileData._id ? true : false;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have an application. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new application at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already applied for ${formName}`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
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
          window.location.href = "Educational-assistance-user.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "Educational-assistance-user.html");
}

document.addEventListener('DOMContentLoaded', function() {
  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);
});

function showOtpLockoutModal(unlockAt, email) {
  let seconds = Math.ceil((unlockAt - Date.now()) / 1000);
  Swal.fire({
    icon: 'error',
    title: 'Too Many Attempts',
    html: `<span id="otp-timer"></span> before you can send another OTP.`,
    confirmButtonColor: '#0A2C59',
    allowOutsideClick: true,
    allowEscapeKey: true,
    showConfirmButton: false,
    didOpen: () => {
      const timerElem = Swal.getHtmlContainer().querySelector('#otp-timer');
      const interval = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerElem.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (seconds <= 0) {
          clearInterval(interval);
          Swal.close();
          clearUserLockout(email);
          enableVerifyBtn();
        }
      }, 1000);
      timerElem.textContent = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  });
  disableVerifyBtn(seconds);
}

function disableVerifyBtn(seconds) {
  const verifyBtn = document.querySelector('.verify-btn');
  if (verifyBtn) {
    verifyBtn.disabled = true;
    const origText = verifyBtn.textContent;
    let left = seconds;
    const interval = setInterval(() => {
      left--;
      const m = Math.floor(left / 60);
      const s = left % 60;
      verifyBtn.textContent = `Wait ${m}:${s.toString().padStart(2, '0')}`;
      if (left <= 0) {
        clearInterval(interval);
        verifyBtn.disabled = false;
        verifyBtn.textContent = origText;
      }
    }, 1000);
  }
}

function enableVerifyBtn() {
  const verifyBtn = document.querySelector('.verify-btn');
  if (verifyBtn) {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify Account";
  }
}

function getLockoutKey(email) {
  return `otpLockoutUntil_${email}`;
}
function setUserLockout(email, unlockAt) {
  localStorage.setItem(getLockoutKey(email), unlockAt);
}
function getUserLockout(email) {
  return localStorage.getItem(getLockoutKey(email));
}
function clearUserLockout(email) {
  localStorage.removeItem(getLockoutKey(email));
}


document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const verificationStrip = document.getElementById("verification-strip");

  let user = null; // Keep user data for verification status

  // Fetch User Info
  try {
    const res = await fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    user = await res.json();

    // Show verification strip if user is not verified
    if (!user.isVerified) {
      if (verificationStrip) {
        verificationStrip.style.display = "flex";
      }

      // Disable navigation buttons
      const navSelectors = [
        "#kkProfileNavBtnDesktop",
        "#kkProfileNavBtnMobile",
        "#lgbtqProfileNavBtnDesktop",
        "#lgbtqProfileNavBtnMobile",
        "#educAssistanceNavBtnDesktop",
        "#educAssistanceNavBtnMobile",
        ".announcement-btn",
      ];
      navSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((btn) => {
          btn.classList.add("disabled");
          btn.setAttribute("tabindex", "-1");
          btn.setAttribute("aria-disabled", "true");
          btn.style.pointerEvents = "none"; // Disable pointer events
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
              icon: "warning",
              title: "Account Verification Required",
              text: "Please verify your account to access this feature.",
              confirmButtonText: "OK",
            });
          });
        });
      });
    }
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
  }
});