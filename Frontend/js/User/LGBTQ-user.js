document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ LGBTQ-user.js loaded");

  const form = document.getElementById("lgbtqForm");
  if (!form) {
    console.error("❌ Form not found!");
    return;
  }

  console.log("✅ Form found, attaching listener...");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📌 Submit event triggered");

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ No token found");
      Swal.fire("Error", "You must be logged in to submit.", "error");
      return;
    }

    const formData = new FormData(form);

    try {
      const res = await fetch("http://localhost:5000/api/lgbtqprofiling", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      console.log("📡 Response status:", res.status);

      const data = await res.json();
      console.log("📡 Response data:", data);

      if (res.ok) {
        Swal.fire("✅ Success", "Form submitted successfully!", "success");
        form.reset();
      } else {
        Swal.fire("❌ Error", data.message || "Submission failed.", "error");
      }
    } catch (err) {
      console.error("🚨 Fetch error:", err);
      Swal.fire("Error", "Something went wrong. Try again later.", "error");
    }
  });
});
