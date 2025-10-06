document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token"); // <-- Updated line

  (function() {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token"); // <-- Updated line
    function sessionExpired() {
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Please login again.',
        confirmButtonColor: '#0A2C59',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        window.location.href = "./admin-log.html";
      });
    }
    if (!token) {
      sessionExpired();
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        sessionExpired();
      }
    } catch (e) {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
      sessionExpired();
    }
  })();
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
      console.log("Raw KKProfile:", kkProfile);

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
        console.log("User birthday:", user.birthday);
        console.log("Calculated age:", calculateAge(user.birthday));
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
  if (imgRes.ok) {
    const { imageUrl } = await imgRes.json();
    console.log("Profile image response:", { imageUrl });

    const profileImg = document.getElementById("profile-img");
    if (profileImg && imageUrl) {
      console.log("Setting profile image:", imageUrl);
      profileImg.src = `http://localhost:5000/profile_images/1758435327738-305279128.png`;
    }
  }
} catch (err) {
  console.error("Failed to fetch KKProfile image:", err);
}

  // Always enable the verify button for unverified users
  const verifyBtn = document.querySelector('.verify-btn');
  if (verifyBtn) {
    verifyBtn.disabled = false; // Ensure it's clickable

    verifyBtn.addEventListener('click', async function() {
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
        html:
          `<div style="display:flex;justify-content:center;gap:8px;">
            <input id="otp1" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;" autofocus>
            <input id="otp2" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;">
            <input id="otp3" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;">
            <input id="otp4" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;">
            <input id="otp5" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;">
            <input id="otp6" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;">
          </div>`,
        showCancelButton: true,
        confirmButtonText: 'Verify',
        cancelButtonText: 'Cancel',
        focusConfirm: false,
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
        preConfirm: () => {
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
          }
          return otp;
        }
      });

      if (!otp) return;

      // Step 4: Verify OTP with backend
      try {
        const verifyRes = await fetch('http://localhost:5000/api/users/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          Swal.fire('Verified!', 'Your account has been verified.', 'success').then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire('Error', verifyData.message || 'Invalid or expired OTP', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to verify OTP', 'error');
      }
    });
  }

  // Logout button functionality
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = './index.html'; // Adjust path if needed
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
  }
});
