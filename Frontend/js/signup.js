document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(signupForm); // Automatically collects all inputs including files

        try {
            const response = await fetch('http://localhost:5000/api/users/smart/register', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration Successful!');
                // Optionally, store token if needed: localStorage.setItem('token', data.token);
                window.location.href = '/Frontend/html/login.html'; // Redirect to login page
            } else {
                alert(data.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while registering. Please try again.');
        }
    });
});
