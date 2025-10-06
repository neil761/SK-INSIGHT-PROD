// lgbtqprofile.js

// 🔹 Redirect to login if no token
(function() {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
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
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
      sessionExpired();
    }
  } catch (e) {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionExpired();
  }
})();

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("lgbtqprofile.js loaded ✅");

  const tableBody = document.querySelector(".tables tbody");

  // Custom dropdown elements
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
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {
    year: "",
    cycle: "",
    lgbtqClassification: "",
    search: ""
  };

  // 🔹 Fetch cycles for LGBTQ
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/lgbtq", {
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
      sortedYears.forEach(year => {
        const yearOption = document.createElement("a");
        yearOption.href = "#";
        yearOption.className = "dropdown-option";
        yearOption.textContent = year;
        yearOption.addEventListener("click", (e) => {
          e.preventDefault();
          yearButton.textContent = year;
          currentFilters.year = year;

          // Reset cycle/classification
          cycleButton.textContent = "Cycle";
          currentFilters.cycle = "";
          cycleButton.disabled = false;
          classificationButton.textContent = "Classification";
          classificationButton.disabled = true;

          // Populate cycle dropdown for selected year
          populateCycleDropdown(yearMap[year]);
          yearContent.style.display = "none";
        });
        yearContent.appendChild(yearOption);
      });

      // Reset buttons on load
      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      cycleButton.disabled = true;
      classificationButton.textContent = "Classification";
      classificationButton.disabled = true;
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  // Populate cycle dropdown for selected year
  function populateCycleDropdown(cycles) {
    cycleContent.innerHTML = "";
    cycles.forEach(cycle => {
      const cycleOption = document.createElement("a");
      cycleOption.href = "#";
      cycleOption.className = "dropdown-option";
      cycleOption.textContent = `Cycle ${cycle}`;
      cycleOption.addEventListener("click", (e) => {
        e.preventDefault();
        cycleButton.textContent = `Cycle ${cycle}`;
        currentFilters.cycle = cycle;

        // Enable classification dropdown
        classificationButton.disabled = false;
        cycleContent.style.display = "none";
      });
      cycleContent.appendChild(cycleOption);
    });
  }

  // Dropdown open/close logic (same as KK)
  yearButton.addEventListener("click", (e) => {
    e.stopPropagation();
    yearContent.style.display = yearContent.style.display === "block" ? "none" : "block";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
  });
  cycleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cycleButton.disabled) {
      cycleContent.style.display = cycleContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
      classificationContent.style.display = "none";
    }
  });
  classificationButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!classificationButton.disabled) {
      classificationContent.style.display = classificationContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
      cycleContent.style.display = "none";
    }
  });
  window.addEventListener("click", () => {
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
  });

  // Classification dropdown options
  const classifications = [
    "Lesbian", "Gay", "Bisexual", "Transgender", "Queer", "Intersex", "Asexual", "Other"
  ];
  classificationContent.innerHTML = "";
  classifications.forEach(c => {
    const option = document.createElement("a");
    option.href = "#";
    option.className = "dropdown-option";
    option.textContent = c;
    option.addEventListener("click", (e) => {
      e.preventDefault();
      classificationButton.textContent = c;
      currentFilters.lgbtqClassification = c;
      classificationContent.style.display = "none";
    });
    classificationContent.appendChild(option);
  });

  // 🔹 Fetch profiles
  async function fetchProfiles(params = {}) {
    try {
      let url = "http://localhost:5000/api/lgbtqprofiling";
      const queryObj = {};

      // If filtering by year, cycle, or classification
      if (params.year) queryObj.year = params.year;
      if (params.cycle && params.year) queryObj.cycle = params.cycle; // Only allow cycle if year is selected
      if (params.lgbtqClassification) queryObj.lgbtqClassification = params.lgbtqClassification;
      if (params.search) queryObj.search = params.search;

      const query = new URLSearchParams(queryObj).toString();
      if (query) url += `?${query}`;

      console.log("🔎 Request URL:", url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      allProfiles = data;
      console.log("✅ Profiles fetched:", data);
      renderProfiles(data);
    } catch (err) {
      console.error("❌ Error fetching profiles:", err);
    }
  }

  // 🔹 Render profiles
  function renderProfiles(profiles) {
    tableBody.innerHTML = "";
    if (!profiles.length) {
      tableBody.innerHTML = `<tr><td colspan="5">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${p.displayData?.residentName || "N/A"}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
        <td>${p.displayData?.sexAssignedAtBirth ?? "N/A"}</td>
        <td><button class="view-btn" data-id="${p._id}" style="color: white;"><i class="fa-solid fa-eye" style = "color: #ffffffff"></i> Review</button></td>
      `;
      tableBody.appendChild(row);
    });

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/lgbtqprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        showProfileModal(profile);
      })
    );
  }

  // 🔹 Show modal
  function showProfileModal(p) {
    const modal = document.getElementById("profileModal");
    const header = document.getElementById("profileHeader");
    const details = document.getElementById("profileDetails");

    const fullName = p.displayData?.residentName || "N/A";
    const age = p.displayData?.age ?? "N/A";
    const birthday = p.displayData?.birthday ? new Date(p.displayData.birthday).toLocaleDateString() : "N/A";
    const sexAssignedAtBirth = p.displayData?.sexAssignedAtBirth ?? "N/A";
    const lgbtqClassification = p.displayData?.lgbtqClassification ?? "N/A";
    const idImage = p.displayData?.idImage
      ? `http://localhost:5000/uploads/lgbtq_id_images/${p.displayData.idImage}`
      : null;

    // Clean, minimal header with just the name
    header.innerHTML = `
      <div class="profile-name">${fullName}</div>
    `;

    // Organized, modern layout for essential info
    details.innerHTML = `
      <div class="profile-details-modal">
        <div class="profile-details-section">
          <div class="profile-details-row">
            <div class="profile-detail">
              <span class="label">Full Name</span>
              <span class="value">${fullName}</span>
            </div>
          </div>
          
          <div class="profile-details-row three-columns">
            <div class="profile-detail">
              <span class="label">Age</span>
              <span class="value">${age}</span>
            </div>
            <div class="profile-detail">
              <span class="label">Birthday</span>
              <span class="value">${birthday}</span>
            </div>
            <div class="profile-detail">
              <span class="label">Sex Assigned at Birth</span>
              <span class="value">${sexAssignedAtBirth}</span>
            </div>
          </div>

          <div class="profile-details-row">
            <div class="profile-detail emphasis">
              <span class="label">LGBTQIA+ Classification</span>
              <span class="value">${lgbtqClassification}</span>
            </div>
          </div>
        </div>

        ${idImage ? `
          <div class="profile-details-section id-section">
            <div class="profile-detail">
              <span class="label">Valid ID</span>
              <div class="id-image-container">
                <img src="${idImage}" alt="Valid ID" class="id-image"/>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    modal.style.display = "flex";
    document.body.classList.add("modal-open");
  }

  // 🔹 Filter button logic
  filterBtn.addEventListener("click", () => {
    // Use the values from the custom dropdown buttons
    const selectedYear = yearButton.textContent !== "Year" ? yearButton.textContent : "";
    const selectedCycle = cycleButton.textContent !== "Cycle" ? cycleButton.textContent.replace("Cycle ", "") : "";
    const selectedClassification = classificationButton.textContent !== "Classification" ? classificationButton.textContent : "";

    // Only allow filtering if year and cycle are selected
    if (!selectedYear || !selectedCycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }

    currentFilters.year = selectedYear;
    currentFilters.cycle = selectedCycle;
    currentFilters.lgbtqClassification = selectedClassification;

    fetchProfiles(currentFilters);
  });

  // 🔹 Clear button logic
  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    classificationButton.disabled = true;
    classificationButton.textContent = "Classification";
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
    currentFilters = {};
    fetchProfiles({});
  });

  // 🔹 Initial load
  fetchCycles();
  fetchProfiles({});
});

// Helper: Capitalize first letter
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
