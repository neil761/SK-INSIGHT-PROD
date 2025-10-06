// 🔹 Redirect to login if no token or token expired
(function () {
  const token = sessionStorage.getItem("token"); // Only sessionStorage!

  function sessionExpired() {
    Swal.fire({
      icon: "warning",
      title: "Session Expired",
      text: "Please login again.",
      confirmButtonColor: "#0A2C59",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "./admin-log.html";
    });
  }

  if (!token) {
    sessionExpired();
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      sessionStorage.removeItem("token");
      sessionExpired();
    }
  } catch {
    sessionStorage.removeItem("token");
    sessionExpired();
  }
})();

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("kkprofile.js loaded ✅");

  // 🔹 Element references
  const tableBody = document.querySelector(".tables tbody");
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const classificationDropdown = document.getElementById("classificationDropdown");
  const classificationButton = classificationDropdown.querySelector(".dropdown-button");
  const classificationContent = classificationDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {};

  // 🔹 Fetch form cycles and populate dropdown
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/kk", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch cycles");

      const cycles = await res.json();

      // Group cycles by year
      yearMap = {};
      cycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });

      sortedYears = Object.keys(yearMap).sort((a, b) => b - a);

      // Populate year dropdown
      yearContent.innerHTML = "";
      sortedYears.forEach((year) => {
        const yearOption = document.createElement("a");
        yearOption.href = "#";
        yearOption.className = "dropdown-option";
        yearOption.textContent = year;
        yearOption.addEventListener("click", (e) => {
          e.preventDefault();
          yearButton.textContent = year;
          currentFilters.year = year;

          cycleButton.textContent = "Cycle";
          classificationButton.textContent = "Classification";
          cycleButton.disabled = false;
          classificationButton.disabled = true;

          populateCycleDropdown(yearMap[year]);
          yearContent.style.display = "none";
        });
        yearContent.appendChild(yearOption);
      });

      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      classificationButton.textContent = "Classification";
      cycleButton.disabled = true;
      classificationButton.disabled = true;
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  // 🔹 Populate cycle dropdown
  function populateCycleDropdown(cycles) {
    cycleContent.innerHTML = "";
    cycles.forEach((cycle) => {
      const cycleOption = document.createElement("a");
      cycleOption.href = "#";
      cycleOption.className = "dropdown-option";
      cycleOption.textContent = `Cycle ${cycle}`;
      cycleOption.addEventListener("click", (e) => {
        e.preventDefault();
        cycleButton.textContent = `Cycle ${cycle}`;
        currentFilters.cycle = cycle;
        classificationButton.disabled = false;
        cycleContent.style.display = "none";
      });
      cycleContent.appendChild(cycleOption);
    });
  }

  // 🔹 Dropdown logic
  const dropdowns = [
    [yearButton, yearContent],
    [cycleButton, cycleContent],
    [classificationButton, classificationContent],
  ];

  dropdowns.forEach(([button, content]) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (button.disabled) return;
      dropdowns.forEach(([_, c]) => (c.style.display = "none"));
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

  window.addEventListener("click", () => {
    dropdowns.forEach(([_, content]) => (content.style.display = "none"));
  });

  // 🔹 Fetch and render profiles
  async function fetchProfiles(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query
        ? `http://localhost:5000/api/kkprofiling?${query}`
        : `http://localhost:5000/api/kkprofiling`;

      console.log("🔎 Request URL:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      allProfiles = data;
      renderProfiles(data);
      console.log("✅ Profiles fetched:", data);
    } catch (err) {
      console.error("❌ Error fetching profiles:", err);
    }
  }

  // 🔹 Render profiles into table
  function renderProfiles(profiles) {
    tableBody.innerHTML = "";

    if (!profiles.length) {
      tableBody.innerHTML = `<tr><td colspan="8">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const lastname = capitalize(p.lastname);
      const firstname = capitalize(p.firstname);
      const middlename = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
      const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
      const fullName = `${lastname}, ${firstname} ${middlename} ${suffix}`.trim();

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${fullName}</td>
        <td>${p.gender || "-"}</td>
        <td>${p.user?.age ?? "N/A"}</td>
        <td>${p.purok ? `Purok ${p.purok}` : "-"}</td>
        <td>${p.civilStatus || "-"}</td>
        <td>${p.workStatus || "-"}</td>
        <td>
          <button class="view-btn" data-id="${p._id}">
            <i class="fa-solid fa-eye" style="color:#fff"></i> Review
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(`http://localhost:5000/api/kkprofiling/${btn.dataset.id}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        const profile = await res.json();
        showProfileModal(profile);
      })
    );
  }

  // 🔹 Capitalize helper
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // 🔹 Profile modal
  function showProfileModal(p) {
    const modal = document.getElementById("profileModal");
    const header = document.getElementById("profileHeader");
    const details = document.getElementById("profileDetails");

    const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
    const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
    const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

    // Fetch profile image
    fetch(`http://localhost:5000/api/kkprofiling/image/${p._id}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject("No image")))
      .then((blob) => {
        const imgUrl = URL.createObjectURL(blob);
        header.innerHTML = `<img src="${imgUrl}" alt="Profile Image"/><div class="profile-name">${fullName}</div>`;
      })
      .catch(() => {
        header.innerHTML = `<img src="/Frontend/assets/default-profile.png" alt="Profile Image"/><div class="profile-name">${fullName}</div>`;
      });

    details.innerHTML = `
      <div class="profile-details-modal">
        <div class="profile-details-row full">
          <div class="profile-detail">
            <span class="label">Address</span>
            <span class="value">${p.purok ? `Purok ${p.purok}` : ""}${p.barangay ? `, ${p.barangay}` : ""}${p.municipality ? `, ${p.municipality}` : ""}</span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail"><span class="label">Age</span><span class="value">${p.user?.age ?? "N/A"}</span></div>
          <div class="profile-detail"><span class="label">Gender</span><span class="value">${p.gender}</span></div>
          <div class="profile-detail"><span class="label">Birthday</span><span class="value">${p.user?.birthday ? new Date(p.user.birthday).toLocaleDateString() : "-"}</span></div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail"><span class="label">Email</span><span class="value">${p.email || "-"}</span></div>
          <div class="profile-detail"><span class="label">Contact</span><span class="value">${p.contactNumber || "-"}</span></div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail"><span class="label">Civil Status</span><span class="value">${p.civilStatus || "-"}</span></div>
          <div class="profile-detail"><span class="label">Youth Age Group</span><span class="value">${p.youthAgeGroup || "-"}</span></div>
          <div class="profile-detail"><span class="label">Education</span><span class="value">${p.educationalBackground || "-"}</span></div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail"><span class="label">Work Status</span><span class="value">${p.workStatus || "-"}</span></div>
          <div class="profile-detail"><span class="label">SK Voter</span><span class="value">${p.registeredSKVoter ? "Yes" : "No"}</span></div>
          <div class="profile-detail"><span class="label">National Voter</span><span class="value">${p.registeredNationalVoter ? "Yes" : "No"}</span></div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail"><span class="label">Attended KK Assembly</span><span class="value">${p.attendedKKAssembly ? "Yes" : "No"}</span></div>
          ${
            p.attendedKKAssembly
              ? `<div class="profile-detail"><span class="label">Times Attended</span><span class="value">${p.attendanceCount || "-"}</span></div>`
              : `<div class="profile-detail"><span class="label">Reason for Not Attending</span><span class="value">${p.nowhy || "-"}</span></div>`
          }
        </div>
      </div>
    `;

    // 🔹 Export button logic
    const printBtn = document.getElementById("downloadDocx");
    if (printBtn) {
      printBtn.onclick = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/kkprofiling/export/${p._id}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
          });
          if (!res.ok) throw new Error("Failed to generate DOCX");

          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${p.lastname}_${p.firstname}_KKProfile.docx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("❌ Error exporting Word:", err);
          alert("Failed to export Word document");
        }
      };
    }

    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    document.querySelector(".close-btn").onclick = () => {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
    };
  }

  // 🔹 Search
  searchInput.addEventListener("keyup", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const filteredProfiles = allProfiles.filter(
      (p) =>
        (p.firstname && p.firstname.toLowerCase().includes(searchTerm)) ||
        (p.middlename && p.middlename.toLowerCase().includes(searchTerm)) ||
        (p.lastname && p.lastname.toLowerCase().includes(searchTerm)) ||
        (p.barangay && p.barangay.toLowerCase().includes(searchTerm)) ||
        (p.purok && p.purok.toLowerCase().includes(searchTerm))
    );
    renderProfiles(filteredProfiles);
  });

  // 🔹 Date/Time + Greeting
  function updateDateTime() {
    const options = { timeZone: "Asia/Manila" };
    const now = new Date(new Date().toLocaleString("en-US", options));
    const hours = now.getHours();

    let greeting = "Good evening",
      iconClass = "fa-solid fa-moon",
      iconColor = "#183153";

    if (hours < 12) {
      greeting = "Good morning";
      iconClass = "fa-solid fa-sun";
      iconColor = "#f7c948";
    } else if (hours < 18) {
      greeting = "Good afternoon";
      iconClass = "fa-solid fa-cloud-sun";
      iconColor = "#f7c948";
    }

    const weekday = now.toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Manila" });
    const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
    let hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;

    document.getElementById("greeting").textContent = greeting;
    document.getElementById("header-date").textContent = `${weekday}, ${dateStr} -`;
    document.getElementById("datetime").textContent = `${hour}:${minute} ${ampm}`;
    const icon = document.getElementById("greeting-icon");
    icon.className = iconClass;
    icon.style.color = iconColor;
  }

  setInterval(updateDateTime, 1000);
  updateDateTime();

  // 🔹 Initial load
  fetchCycles();
  fetchProfiles();
});
