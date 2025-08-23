document.addEventListener('DOMContentLoaded', () => {
    console.log('Signup.js loaded');

    const signupForm = document.getElementById('signupForm');
    if (!signupForm) {
        console.error('Signup form not found.');
        return;
    }

    console.log('Signup form found. Adding event listener...');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted. Preparing FormData...');

        const formData = new FormData(signupForm);

        try {
            const response = await fetch('http://localhost:5000/api/users/smart/register', {
                method: 'POST',
                body: formData
            });

            console.log('Fetch completed. Status:', response.status);

            const responseText = await response.text();
            console.log('Response Text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed Data:', data);
            } catch (error) {
                console.error('Invalid JSON response:', responseText);
                alert('Unexpected server response.');
                return;
            }

            if (response.ok) {
                alert(data.message || 'Registration Successful!');
                console.log('Redirecting to login page...');

                // Primary Redirect
                window.location.href = '/html/login.html';
                // Fallback Redirect after 1 second (in case the first fails)
                setTimeout(() => {
                    console.log('Fallback redirect executing...');
                    window.location.href = 'login.html';
                }, 1000);

            } else {
                alert(data.message || 'Registration failed.');
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            alert('An error occurred during registration.');
        }
    });
});
