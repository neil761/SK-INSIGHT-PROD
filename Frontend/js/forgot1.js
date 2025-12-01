document.addEventListener('DOMContentLoaded', function () {
        const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
            ? window.API_BASE
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'http://localhost:5000'
                : 'https://sk-insight.online';
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = form.email.value;

        Swal.fire({
            title: 'Sending OTP...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
                const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            Swal.close();

            if (res.ok) {
                // Create custom OTP input fields
                const otpHtml = `
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        ${Array.from({ length: 6 }).map((_, i) => `
                            <input type="text" id="otp-${i}" maxlength="1" 
                                style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #000; border-radius: 5px;" />
                        `).join('')}
                    </div>
                `;

                Swal.fire({
                    title: 'Enter OTP',
                    html: `
                        <p>Check your email for the OTP code</p>
                        ${otpHtml}
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Verify OTP',
                    didOpen: () => {
                        // Focus on the first input field
                        const firstInput = document.getElementById('otp-0');
                        if (firstInput) firstInput.focus();

                        // Add event listeners for auto-focus and navigation
                        Array.from({ length: 6 }).forEach((_, i) => {
                            const input = document.getElementById(`otp-${i}`);
                            input.addEventListener('input', (e) => {
                                if (e.target.value.length === 1 && i < 5) {
                                    document.getElementById(`otp-${i + 1}`).focus();
                                }
                            });
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                                    document.getElementById(`otp-${i - 1}`).focus();
                                }
                            });
                        });
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        // Collect the OTP from the input fields
                        const otpCode = Array.from({ length: 6 })
                            .map((_, i) => document.getElementById(`otp-${i}`).value)
                            .join('');

                        if (otpCode.length === 6) {
                                const verifyRes = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, otpCode })
                            });
                            const verifyData = await verifyRes.json();

                            if (verifyRes.ok) {
                                // ✅ SweetAlert for successful OTP
                                Swal.fire({
                                    icon: 'success',
                                    title: 'OTP Verified!',
                                    html: `
                                        <p>Enter your new password:</p>
                                        <div style="position: relative; display: flex; align-items: center;">
                                            <input type="password" id="newPassword" placeholder="Enter new password" 
                                                style="width: 100%; padding-right: 40px; height: 40px; border: 1px solid #000; border-radius: 5px;" />
                                            <i id="togglePassword" class="fa fa-eye" 
                                                style="position: absolute; right: 10px; cursor: pointer;"></i>
                                        </div>
                                    `,
                                    showCancelButton: true,
                                    confirmButtonText: 'Reset Password',
                                    didOpen: () => {
                                        const togglePassword = document.getElementById('togglePassword');
                                        const passwordInput = document.getElementById('newPassword');
                                                                                // insert password requirements UI
                                                                                const reqWrap = document.createElement('div');
                                                                                reqWrap.id = 'swal-password-reqs';
                                                                                reqWrap.style.marginTop = '10px';
                                                                                reqWrap.style.fontSize = '0.65rem';
                                                                                reqWrap.style.textAlign = 'left';
                                                                                reqWrap.setAttribute('aria-live','polite');
                                                                                reqWrap.innerHTML = `
                                                                                    <div style="display:flex;flex-direction:column;gap:8px;">
                                                                                        <div id="swal-pw-length" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least 8 characters</div>
                                                                                        <div id="swal-pw-special" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one special character</div>
                                                                                        <div id="swal-pw-upper" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one uppercase letter</div>
                                                                                        <div id="swal-pw-number" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one number</div>
                                                                                    </div>
                                                                                `;
                                                                                passwordInput.parentElement.insertAdjacentElement('afterend', reqWrap);

                                                                                const reqLength = document.getElementById('swal-pw-length');
                                                                                const reqUpper = document.getElementById('swal-pw-upper');
                                                                                const reqNumber = document.getElementById('swal-pw-number');
                                                                                const reqSpecial = document.getElementById('swal-pw-special');

                                                                                function checkPassword(pw) {
                                                                                    return {
                                                                                        length: pw.length >= 8,
                                                                                        upper: /[A-Z]/.test(pw),
                                                                                        number: /\d/.test(pw),
                                                                                        special: /[\W_]/.test(pw)
                                                                                    };
                                                                                }

                                                                                const confirmBtn = Swal.getConfirmButton();
                                                                                if (confirmBtn) confirmBtn.disabled = true; // start disabled until checks pass

                                        function updateReqs() {
                                          const pw = passwordInput.value || '';
                                          const r = checkPassword(pw);

                                          // If no input, show plain text without icons
                                          if (!pw) {
                                            reqLength.textContent = 'At least 8 characters';
                                            reqLength.style.color = '#666';
                                            reqUpper.textContent = 'At least one uppercase letter';
                                            reqUpper.style.color = '#666';
                                            reqNumber.textContent = 'At least one number';
                                            reqNumber.style.color = '#666';
                                            reqSpecial.textContent = 'At least one special character';
                                            reqSpecial.style.color = '#666';
                                          } else {
                                            // Show checkmarks/X icons when there's input
                                            if (r.length) { reqLength.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least 8 characters'; reqLength.style.color = '#1a8a1a'; } else { reqLength.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least 8 characters'; reqLength.style.color = '#c33'; }
                                            if (r.upper) { reqUpper.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one uppercase letter'; reqUpper.style.color = '#1a8a1a'; } else { reqUpper.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one uppercase letter'; reqUpper.style.color = '#c33'; }
                                            if (r.number) { reqNumber.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one number'; reqNumber.style.color = '#1a8a1a'; } else { reqNumber.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one number'; reqNumber.style.color = '#c33'; }
                                            if (r.special) { reqSpecial.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one special character'; reqSpecial.style.color = '#1a8a1a'; } else { reqSpecial.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one special character'; reqSpecial.style.color = '#c33'; }
                                          }

                                          const ok = r.length && r.upper && r.number && r.special;
                                          if (confirmBtn) confirmBtn.disabled = !ok;
                                        }                                                                                passwordInput.addEventListener('input', updateReqs);

                                                                                togglePassword.addEventListener('click', () => {
                                                                                        const isHidden = passwordInput.type === "password";

                                                                                        passwordInput.type = isHidden ? "text" : "password";

                                                                                        if (isHidden) {
                                                                                                togglePassword.classList.remove("fa-eye");
                                                                                                togglePassword.classList.add("fa-eye-slash");
                                                                                        } else {
                                                                                                togglePassword.classList.remove("fa-eye-slash");
                                                                                                togglePassword.classList.add("fa-eye");
                                                                                        }
                                                                                });
                                                                                // initialize
                                                                                setTimeout(updateReqs, 0);
                                    }
                                }).then(async (pwResult) => {
                                    if (pwResult.isConfirmed) {
                                        const newPassword = document.getElementById('newPassword').value;

                                        // Send new password to backend
                                            const resetRes = await fetch(`${API_BASE}/api/auth/verify-otp-reset`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email, otpCode, newPassword })
                                        });
                                        const resetData = await resetRes.json();
                                        if (resetRes.ok) {
                                            Swal.fire('Success', 'Your password has been reset!', 'success').then(() => {
                                                window.location.href = '../../html/user/login.html';
                                            });
                                        } else {
                                            Swal.fire({
                                                icon: 'error',
                                                title: 'Error',
                                                text: resetData.error || 'Failed to reset password',
                                                allowOutsideClick: false,
                                                confirmButtonColor: '#0A2C59'
                                            });
                                        }
                                    }
                                });
                            } else {
                                // ❌ SweetAlert for failed OTP
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Invalid OTP',
                                    text: verifyData.error || 'The OTP you entered is incorrect or expired.'
                                });
                            }
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Incomplete OTP',
                                text: 'Please enter all 6 digits of the OTP.'
                            });
                        }
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'Failed to send OTP. Please try again.'
                });
            }
        } catch (err) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Could not connect to the server. Please try again later.'
            });
        }
    });
});