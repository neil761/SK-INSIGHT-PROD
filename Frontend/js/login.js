document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordField = document.getElementById('passwordField');
    const rememberMeCheckbox = document.getElementById('rememberMe'); // Make sure your checkbox has this id

    // On page load, check for token in sessionStorage or localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html'; // Redirect to dashboard/home if already logged in
        return;
    }

    // Show/Hide password toggle
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword 
            ? '<i class="fa-solid fa-eye-slash"></i>' 
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email.value;
        const password = passwordField.value;
        const rememberMe = rememberMeCheckbox.checked;

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                // Store token based on Remember Me
                if (rememberMe) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.removeItem('token');
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.removeItem('token');
                }
                window.location.href = 'index.html'; // Redirect to dashboard/home
            } else {
                alert(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    });
});