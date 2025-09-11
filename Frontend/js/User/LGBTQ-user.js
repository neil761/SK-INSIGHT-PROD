// File: /Frontend/js/User/LGBTQ-user.js

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('lgbtqForm');
  const birthdayInput = document.getElementById('birthday');

  // Get token from sessionStorage or localStorage
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  // Fetch user info and auto-fill birthday
  if (token && birthdayInput) {
    fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (user && user.birthday) {
          const date = new Date(user.birthday);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          birthdayInput.value = `${yyyy}-${mm}-${dd}`;
        }
      })
      .catch((err) => console.error('Error fetching user:', err));
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const formData = new FormData(form);

    try {
      const response = await fetch('http://localhost:5000/api/lgbtqprofiling', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log('Showing SweetAlert...');
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: data.message || 'LGBTQIA+ Profile submitted successfully!',
          confirmButtonColor: '#0A2C59',
          timer: 4000,
          timerProgressBar: true,
          showConfirmButton: false,
          didClose: () => {
            console.log('SweetAlert closed, redirecting...');
            window.location.href = '../confirmation/html/lgbtqconfirmation.html';
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: data.error || 'Submission failed. Please check your inputs.',
          confirmButtonColor: '#0A2C59'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Network error. Please try again later.',
        confirmButtonColor: '#0A2C59'
      });
    }
  });
});
