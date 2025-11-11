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
    // Optionally show lockout modal here
    return false;
  } else {
    const verifyData = await verifyRes.json();
    Swal.showValidationMessage(verifyData.message || 'Invalid or expired OTP');
    return false;
  }
}

export function setupVerifyEmail(user) {
  const verifyBtn = document.querySelector('.verify-btn');
  if (!verifyBtn) return;

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
          window.verificationOtpLockoutUntil = user.emailVerificationOtpSendWindowStart + 2 * 60 * 1000;
          localStorage.setItem('verificationOtpLockoutUntil', window.verificationOtpLockoutUntil); // <-- verification only
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
        } else {
          window.verificationOtpLockoutUntil = null;
          updateVerificationOtpButtons();
          if (window.verificationOtpInterval) {
            clearInterval(window.verificationOtpInterval);
            window.verificationOtpInterval = null;
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }

  function updateVerificationOtpButtons() {
    const now = Date.now();
    const verifyBtn = document.querySelector('.verify-btn');
    const resendAnchor = document.getElementById('verificationResendOtp');
    if (window.verificationOtpLockoutUntil && now < window.verificationOtpLockoutUntil) {
      const left = Math.ceil((window.verificationOtpLockoutUntil - now) / 1000);
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

  verifyBtn.addEventListener('click', async function () {
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

      Swal.close();

      if (sendRes.status === 429) {
        Swal.fire('Too Many Requests', sendData.message || 'Please wait before resending OTP.', 'warning');
        await checkVerificationOtpLockout(email);
        return;
      }
      if (!sendRes.ok) {
        Swal.fire('Error', sendData.message || 'Failed to send OTP', 'error');
        return;
      }
      Swal.fire('OTP Sent', 'Check your email for the OTP code.', 'success');
      await checkVerificationOtpLockout(email);
      showOtpModal(email); // <-- Use the function here
      return;
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
          ${Array.from({ length: 6 }).map((_, i) =>
            `<input id="otp${i + 1}" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;border-radius:8px;border:1px solid #0A2C59;background:#f7faff;box-shadow:0 2px 8px rgba(7,176,242,0.07);" autofocus>`
          ).join('')}
        </div>
        <div style="margin-top:12px;font-size:14px;color:#0A2C59;">
          Check your email for the 6-digit code.<br>
          <a id="verificationResendOtp" style="cursor:pointer; margin-top: 12px;">Resend OTP</a>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Verify',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      customClass: {
        popup: 'otp-modal-popup'
      },
      didOpen: () => {
        for (let i = 1; i <= 6; i++) {
          const input = document.getElementById(`otp${i}`);
          input.addEventListener('input', function () {
            if (this.value.length === 1 && i < 6) {
              document.getElementById(`otp${i + 1}`).focus();
            }
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value === '' && i > 1) {
              document.getElementById(`otp${i - 1}`).focus();
            }
          });
        }
        document.getElementById('otp1').focus();

        // Resend OTP logic
        const resendLink = document.getElementById('verificationResendOtp');
        if (resendLink) {
          resendLink.addEventListener('click', async function (e) {
            e.preventDefault();
            resendLink.textContent = "Sending...";
            resendLink.style.pointerEvents = "none";
            Swal.showLoading();
            try {
              const res = await fetch('http://localhost:5000/api/users/verify/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              const data = await res.json();
              Swal.close();
              if (res.status === 429) {
                const secondsLeft = data.secondsLeft || 120;
                let left = secondsLeft;
                resendLink.style.pointerEvents = "none";
                function updateResendCountdown() {
                  const m = Math.floor(left / 60);
                  const s = left % 60;
                  resendLink.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
                  left--;
                  if (left < 0) {
                    clearInterval(window.verificationResendTimerInterval);
                    resendLink.textContent = "Resend OTP";
                    resendLink.style.pointerEvents = "";
                  }
                }
                updateResendCountdown();
                window.verificationResendTimerInterval = setInterval(updateResendCountdown, 1000);
                await checkVerificationOtpLockout(email);
                return;
              }
              if (res.ok) {
                await Swal.fire('OTP Sent', 'Check your email for the OTP code.', 'success');
                showOtpModal(email); // <-- Reopen modal
              } else {
                Swal.fire('Error', data.message || 'Failed to send OTP', 'error');
                resendLink.textContent = "Resend OTP";
                resendLink.style.pointerEvents = "";
              }
            } catch (err) {
              Swal.fire('Error', 'Could not resend OTP. Please try again.', 'error');
              resendLink.textContent = "Resend OTP";
              resendLink.style.pointerEvents = "";
            }
          });
        }

        // Show timer if lockout is active
        const now = Date.now();
        const lockoutUntil = Number(localStorage.getItem('verificationOtpLockoutUntil'));
        if (lockoutUntil && now < lockoutUntil) {
          const resendLink = document.getElementById('verificationResendOtp');
          if (resendLink) {
            resendLink.style.pointerEvents = "none";
            let left = Math.ceil((lockoutUntil - now) / 1000);
            function updateResendCountdown() {
              const m = Math.floor(left / 60);
              const s = left % 60;
              resendLink.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
              left--;
              if (left < 0) {
                clearInterval(window.verificationResendTimerInterval);
                resendLink.textContent = "Resend OTP";
                resendLink.style.pointerEvents = "";
              }
            }
            updateResendCountdown();
            window.verificationResendTimerInterval = setInterval(updateResendCountdown, 1000);
          }
        }
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
        // Optionally show lockout modal here
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

  function showOtpModal(email) {
    Swal.fire({
      title: 'Enter OTP',
      html: `
        <div style="display:flex;justify-content:center;gap:8px;">
          ${Array.from({ length: 6 }).map((_, i) =>
            `<input id="otp${i + 1}" type="text" maxlength="1" style="width:40px;font-size:2rem;text-align:center;border-radius:8px;border:1px solid #0A2C59;background:#f7faff;box-shadow:0 2px 8px rgba(7,176,242,0.07);" autofocus>`
          ).join('')}
        </div>
        <div style="margin-top:12px;font-size:14px;color:#0A2C59;">
          Check your email for the 6-digit code.<br>
          <a id="verificationResendOtp" style="cursor:pointer; margin-top: 12px;">Resend OTP</a>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Verify',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      customClass: {
        popup: 'otp-modal-popup'
      },
      didOpen: () => {
        for (let i = 1; i <= 6; i++) {
          const input = document.getElementById(`otp${i}`);
          input.addEventListener('input', function () {
            if (this.value.length === 1 && i < 6) {
              document.getElementById(`otp${i + 1}`).focus();
            }
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value === '' && i > 1) {
              document.getElementById(`otp${i - 1}`).focus();
            }
          });
        }
        document.getElementById('otp1').focus();

        // Resend OTP logic
        const resendLink = document.getElementById('verificationResendOtp');
        if (resendLink) {
          resendLink.addEventListener('click', async function (e) {
            e.preventDefault();
            resendLink.textContent = "Sending...";
            resendLink.style.pointerEvents = "none";
            Swal.showLoading();
            try {
              const res = await fetch('http://localhost:5000/api/users/verify/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              const data = await res.json();
              Swal.close();
              if (res.status === 429) {
                const secondsLeft = data.secondsLeft || 120;
                let left = secondsLeft;
                resendLink.style.pointerEvents = "none";
                function updateResendCountdown() {
                  const m = Math.floor(left / 60);
                  const s = left % 60;
                  resendLink.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
                  left--;
                  if (left < 0) {
                    clearInterval(window.verificationResendTimerInterval);
                    resendLink.textContent = "Resend OTP";
                    resendLink.style.pointerEvents = "";
                  }
                }
                updateResendCountdown();
                window.verificationResendTimerInterval = setInterval(updateResendCountdown, 1000);
                await checkVerificationOtpLockout(email);
                return;
              }
              if (res.ok) {
                await Swal.fire('OTP Sent', 'Check your email for the OTP code.', 'success');
                showOtpModal(email); // <-- Reopen modal
              } else {
                Swal.fire('Error', data.message || 'Failed to send OTP', 'error');
                resendLink.textContent = "Resend OTP";
                resendLink.style.pointerEvents = "";
              }
            } catch (err) {
              Swal.fire('Error', 'Could not resend OTP. Please try again.', 'error');
              resendLink.textContent = "Resend OTP";
              resendLink.style.pointerEvents = "";
            }
          });
        }

        // Show timer if lockout is active
        const now = Date.now();
        const lockoutUntil = Number(localStorage.getItem('verificationOtpLockoutUntil'));
        if (lockoutUntil && now < lockoutUntil) {
          const resendLink = document.getElementById('verificationResendOtp');
          if (resendLink) {
            resendLink.style.pointerEvents = "none";
            let left = Math.ceil((lockoutUntil - now) / 1000);
            function updateResendCountdown() {
              const m = Math.floor(left / 60);
              const s = left % 60;
              resendLink.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
              left--;
              if (left < 0) {
                clearInterval(window.verificationResendTimerInterval);
                resendLink.textContent = "Resend OTP";
                resendLink.style.pointerEvents = "";
              }
            }
            updateResendCountdown();
            window.verificationResendTimerInterval = setInterval(updateResendCountdown, 1000);
          }
        }
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
    }).then(async ({ value: otp }) => {
      if (!otp) return;
      const isVerified = await verifyOtp(email, otp);
      if (isVerified) {
        Swal.fire('Verified!', 'Your account has been verified.', 'success').then(() => {
          window.location.reload();
        });
      }
    });
  }
}