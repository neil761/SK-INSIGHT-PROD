document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');

    if (!signupForm) {
        console.error('Signup form not found.');
        return;
    }

    // Show/Hide Password Toggle
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Submit Form (regular signup without ID image/AI checks)
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = signupForm.querySelector('input[name="username"]').value.trim();
        const email = signupForm.querySelector('input[name="email"]').value.trim();
        const password = signupForm.querySelector('input[name="password"]').value;
        const birthday = signupForm.querySelector('input[name="birthday"]').value;

        if (!username || !email || !password || !birthday) {
            Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.' });
            return;
        }

        // Show loading alert
        Swal.fire({
            title: 'Registering...',
            text: 'Please wait while we process your registration.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const payload = { username, email, password, birthday };
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            Swal.close(); // Close loading alert

            const data = await response.json().catch(() => null);

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Registration Successful!', text: 'You can now log in.', timer: 1000, showConfirmButton: false })
                    .then(() => window.location.href = '/Frontend/html/user/login.html');
            } else {
                let alertText = (data && (data.message || data.error)) || 'Please try again.';
                if (data && data.code === 'email_exists') alertText = 'This email is already registered.';
                if (data && data.code === 'username_exists') alertText = 'This username is already taken.';
                Swal.fire({ icon: 'error', title: 'Registration Failed', text: alertText });
            }

        } catch (error) {
            Swal.close(); // Close loading alert if fetch fails
            console.error('Fetch Error:', error);
            Swal.fire({ icon: 'error', title: 'Network Error', text: 'An error occurred during registration.' });
        }
    });

    // Ensure native datepicker has room to open — if not enough space below, scroll the input into center
    // Initialize flatpickr to force the calendar to open ABOVE and append to body to avoid clipping on small screens.
    (function initFlatpickr() {
        const birthdayEl = document.getElementById('birthday');
        if (!birthdayEl) return;

        // If flatpickr is available (loaded via CDN), initialize with desired options.
        function setup() {
            try {
                if (typeof flatpickr === 'function') {
                    flatpickr(birthdayEl, {
                        dateFormat: 'Y-m-d',
                        allowInput: true,
                        // Force above so the calendar opens upward when possible
                        position: 'above',
                        // append to document.body so it's not clipped by container overflow
                        appendTo: document.body,
                        // Use flatpickr on mobile too so placement is consistent
                        disableMobile: true
                    });
                } else {
                    // If flatpickr isn't loaded yet, try again shortly
                    setTimeout(setup, 150);
                }
            } catch (e) {
                console.warn('flatpickr init failed', e);
            }
        }
        setup();
    })();
});