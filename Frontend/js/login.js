document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');

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

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: `Welcome back, ${data.user.username || 'User'}!`,
                    timer: 1000,
                    showConfirmButton: false
                }).then(() => {
                    localStorage.setItem('token', data.token);
                    window.location.href = '/Frontend/html/user/index.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: data.error || 'Please check your credentials.',
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'An error occurred. Please try again.',
            });
        }
    });
});
