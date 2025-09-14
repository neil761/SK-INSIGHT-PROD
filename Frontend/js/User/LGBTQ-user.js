document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('lgbtqForm');
  const birthdayInput = document.getElementById('birthday');

  console.log('LGBTQ-user.js loaded');

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

  if (!form) return;

form.addEventListener("submit", async function (e) {
  e.preventDefault();   // stop browser reload
  e.stopPropagation();  // prevent bubbling

  try {
    const res = await fetch("http://localhost:5000/api/lgbtqprofiling", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: new FormData(form),
    });

    const data = await res.json().catch(() => ({})); // safely parse JSON

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Profile submitted!",
        text: "Redirecting...",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.href = "/Frontend/User/dashboard.html";
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message || "Something went wrong.",
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Server error.",
    });
  }
});


});
