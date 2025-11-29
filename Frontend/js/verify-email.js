async function verifyOtp(email, otp) {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  const verifyRes = await fetch(`${API_BASE}/api/users/verify/confirm`, {
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
    // Optionally show lockout modal here
    return false;
  } else {
    const verifyData = await verifyRes.json();
    Swal.showValidationMessage(verifyData.message || 'Invalid or expired OTP');
    return false;
  }
}

export function setupVerifyEmail(user) {
  // Elements
  const verifyBtn = document.querySelector('.verify-btn');
  const verifyEmailModal = document.getElementById("verifyEmailModal");
  const closeBtn = verifyEmailModal.querySelector(".close-verify-email");
  const verifyEmailInput = document.getElementById("verifyEmailInput");
  const sendVerifyOtpBtn = document.getElementById("sendVerifyOtpBtn");
  const verifyOtpSection = document.getElementById("verifyOtpSection");
  const verifyOtpInputs = document.getElementById("verifyOtpInputs");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const verifyResendOtp = document.getElementById("verifyResendOtp");
  const verifyResendInfo = document.getElementById("verifyResendInfo");
  const verifyOtpTimer = document.getElementById("verifyOtpTimer"); // ADDED
  let hasResent = false;

  // Timer state
  let otpExpiresAt = null;
  let otpTimerInterval = null;

  function startVerifyOtpTimer() {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    if (!otpExpiresAt) {
      if (verifyOtpTimer) verifyOtpTimer.textContent = "";
      if (verifyResendOtp) {
        // allow clicks when no timer
        verifyResendOtp.style.pointerEvents = "";
        verifyResendOtp.classList.remove('disabled');
      }
      hasResent = false; // allow resend if no active timer
      return;
    }

    // keep resend visible during countdown but DO NOT permanently remove/disable it here
    if (verifyResendOtp) {
      // show it and update appearance if needed; do NOT prevent clicks here
      verifyResendOtp.style.display = "";
    }

    function update() {
      const msLeft = otpExpiresAt - Date.now();
      if (msLeft <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
        otpExpiresAt = null;
        if (verifyOtpTimer) verifyOtpTimer.textContent = "OTP expired. You can resend.";
        if (verifyResendOtp) {
          verifyResendOtp.style.pointerEvents = "";
          verifyResendOtp.classList.remove('disabled');
        }
        hasResent = false; // allow resend after expiry
        return;
      }
      const sec = Math.ceil(msLeft / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (verifyOtpTimer) verifyOtpTimer.textContent = `OTP expires in ${m}:${s.toString().padStart(2,"0")}`;
    }
    update();
    otpTimerInterval = setInterval(update, 1000);
  }

  // Open modal
  verifyBtn.addEventListener("click", () => {
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
    verifyEmailInput.value = user?.email || "";
    verifyOtpSection.style.display = "none";
    sendVerifyOtpBtn.style.display = "";
    verifyResendOtp.style.display = "";
    verifyResendInfo.style.display = "none";
    if (verifyOtpTimer) verifyOtpTimer.textContent = "";
    hasResent = false;
    verifyEmailModal.classList.add("active");
    setupOtpInputs();
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    verifyEmailModal.classList.remove("active");
    // clear timer when modal closed
    if (otpTimerInterval) { clearInterval(otpTimerInterval); otpTimerInterval = null; }
    otpExpiresAt = null;
    if (verifyOtpTimer) verifyOtpTimer.textContent = "";
  });

  // Send OTP
  sendVerifyOtpBtn.addEventListener("click", async function () {
    sendVerifyOtpBtn.disabled = true;
    const emailToSend = (verifyEmailInput && verifyEmailInput.value) ? verifyEmailInput.value : '';
    console.log('sendVerifyOtp ->', { api: `${API_BASE}/api/users/verify/send`, email: emailToSend });
    Swal.fire({
      title: "Sending OTP...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const res = await fetch(`${API_BASE}/api/users/verify/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend })
      });
      // Read raw response text for robust parsing and logging
      const rawText = await res.text().catch(() => null);
      let data = null;
      if (rawText) {
        try { data = JSON.parse(rawText); } catch (e) { data = rawText; }
      }
      console.log('sendVerifyOtp response', { status: res.status, statusText: res.statusText, body: data });
      Swal.close();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: "Check your email for the OTP code.",
          confirmButtonColor: "#0A2C59"
        });
        verifyOtpSection.style.display = "";
        sendVerifyOtpBtn.style.display = "none";
        setupOtpInputs();

        // start timer
        otpExpiresAt = Date.now() + 10 * 60 * 1000;
        startVerifyOtpTimer();
      } else {
        console.error('sendVerifyOtp failed', res.status, res.statusText, data);
        const message = (data && typeof data === 'object' && data.message) ? data.message : (typeof data === 'string' ? data : `Failed to send OTP (status ${res.status})`);
        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text: message,
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.close();
      console.error('sendVerifyOtp network/error', err);
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: err && err.message ? `Could not send OTP: ${err.message}` : "Could not send OTP. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    } finally {
      sendVerifyOtpBtn.disabled = false;
    }
  });

  // Setup OTP inputs
  function setupOtpInputs() {
    verifyOtpInputs.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.className = "otp-input";
      input.style.width = "40px";
      input.style.fontSize = "1.5rem";
      input.style.textAlign = "center";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";
      input.addEventListener("input", function (e) {
        if (this.value.length === 1 && i < 5) {
          verifyOtpInputs.querySelectorAll(".otp-input")[i + 1].focus();
        }
        // Paste support
        if (e.inputType === "insertFromPaste") {
          const val = this.value;
          if (/^\d{6}$/.test(val)) {
            val.split("").forEach((digit, idx) => {
              verifyOtpInputs.querySelectorAll(".otp-input")[idx].value = digit;
            });
            verifyOtpInputs.querySelectorAll(".otp-input")[5].focus();
          }
        }
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && this.value === "" && i > 0) {
          verifyOtpInputs.querySelectorAll(".otp-input")[i - 1].focus();
        }
      });
      verifyOtpInputs.appendChild(input);
    }
    verifyOtpInputs.querySelector(".otp-input").focus();
  }

  // Verify OTP
  verifyOtpBtn.addEventListener("click", async function () {
    const otp = Array.from(verifyOtpInputs.querySelectorAll(".otp-input"))
      .map(input => input.value)
      .join("");
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      alert("Please enter the 6-digit OTP");
      return;
    }
    verifyOtpBtn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/users/verify/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmailInput.value, otp })
      });
      const data = await res.json();
      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Verified!',
          text: 'Your account has been verified.',
          confirmButtonColor: '#0A2C59'
        });
        verifyEmailModal.classList.remove("active");
        // clear timer
        if (otpTimerInterval) { clearInterval(otpTimerInterval); otpTimerInterval = null; }
        otpExpiresAt = null;
        if (verifyOtpTimer) verifyOtpTimer.textContent = "";
        window.location.reload();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Verification Failed',
          text: data.message || "Invalid or expired OTP",
          confirmButtonColor: '#0A2C59'
        });
      }
    } catch (err) {
      alert("Could not verify OTP. Please try again.");
    }
    verifyOtpBtn.disabled = false;
  });

  // Resend OTP (only once)
  verifyResendOtp.addEventListener("click", async function (e) {
    e.preventDefault();
    if (hasResent) return;
    hasResent = true;
    verifyResendOtp.textContent = "Sending...";
    verifyResendOtp.style.pointerEvents = "none";
    const emailToSend = (verifyEmailInput && verifyEmailInput.value) ? verifyEmailInput.value : '';
    console.log('resendVerifyOtp ->', { api: `${API_BASE}/api/users/verify/send`, email: emailToSend });
    Swal.fire({
      title: "Sending OTP...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const res = await fetch(`${API_BASE}/api/users/verify/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend })
      });
      const rawText = await res.text().catch(() => null);
      let data = null;
      if (rawText) {
        try { data = JSON.parse(rawText); } catch (e) { data = rawText; }
      }
      console.log('resendVerifyOtp response', { status: res.status, statusText: res.statusText, body: data });
      Swal.close();

      // show resend-info always, only permanently hide resend if backend says 429
      verifyResendInfo.style.display = "";

      if (res.status === 429) {
        // backend signals too many requests -> remove resend button
        verifyResendOtp.style.display = "none";
        verifyResendInfo.textContent = data && data.message ? data.message : "Too many requests. Please wait.";
        // keep hasResent true (no further attempts)
      } else {
        // otherwise keep the resend control available
        verifyResendOtp.style.display = "";
        // allow clicking again after handling result
        hasResent = false;
      }

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: "Check your email for the OTP code.",
          confirmButtonColor: "#0A2C59"
        });
        // restart timer on successful resend/send
        otpExpiresAt = Date.now() + 10 * 60 * 1000;
        startVerifyOtpTimer();
        setupOtpInputs();
      } else if (res.status !== 429) {
        console.error('resend OTP failed', res.status, res.statusText, data);
        const message = (data && typeof data === 'object' && data.message) ? data.message : (typeof data === 'string' ? data : `Failed to resend OTP (status ${res.status})`);
        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text: message,
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.close();
      console.error('resend OTP network/error', err);
      // make resend clickable again on network/server error
      verifyResendInfo.style.display = "";
      verifyResendOtp.style.pointerEvents = "";
      verifyResendOtp.textContent = "Resend OTP";
      hasResent = false;
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: err && err.message ? `Could not resend OTP: ${err.message}` : "Could not resend OTP. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    } finally {
      // Ensure the resend anchor text and pointer state are restored unless server hid it (429)
      if (verifyResendOtp && verifyResendOtp.style.display !== "none") {
        verifyResendOtp.textContent = "Resend OTP";
        verifyResendOtp.style.pointerEvents = "";
        verifyResendOtp.classList.remove('disabled');
      }
    }
  });
}

// Module-level API base so other handlers (send/resend) can use it.
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';