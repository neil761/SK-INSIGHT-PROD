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

    // Submit Form
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(signupForm);

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
            const response = await fetch('http://localhost:5000/api/users/smart/register', {
                method: 'POST',
                body: formData
            });

            Swal.close(); // Close loading alert


            const responseText = await response.text();

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                console.error('Invalid JSON response:', responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Unexpected Response',
                    text: 'The server returned an invalid response.',
                });
                return;
            }

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Registration Successful!',
                    text: data.message || 'You can now log in.',
                    timer: 1000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = '/Frontend/html/user/login.html';
                });
            } else {
                let alertText = data.message || 'Please try again.';
                if (data.code === "email_exists") alertText = "This email is already registered.";
                if (data.code === "username_exists") alertText = "This username is already taken.";
                if (data.code === "address_invalid") alertText = "Your ID address does not match the required location.";
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: alertText,
                });
            }

        } catch (error) {
            Swal.close(); // Close loading alert if fetch fails
            console.error('Fetch Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'An error occurred during registration.',
            });
        }
    });
});