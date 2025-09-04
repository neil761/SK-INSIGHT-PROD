// lgbtqprofile.js

// 🔹 Redirect to login if no token
if (!localStorage.getItem("token")) {
  window.location.href = "/html/admin-log.html";
}

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("lgbtqprofile.js loaded ✅");

  const tableBody = document.querySelector(".tables tbody");
  const yearSelect = document.getElementById("year"); // Cycle
  const cycleSelect = document.getElementById("cycleNumber"); // Year
  const filterBtn = document.getElementById("yearFilterBtn");
  const searchInput = document.querySelector(".search-input");

  let currentFilters = {
  year: "",
  cycle: "",
  classification: "",
  search: ""
};


  // 🔹 Fetch cycles for LGBTQ
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/lgbtq", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch cycles");

      const cycles = await res.json();

      // Group cycles by year
      const yearMap = {};
      cycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });

      // Populate year/cycle dropdowns
      cycleSelect.innerHTML = `<option value="">Select Year</option>`;
      yearSelect.innerHTML = `<option value="">Select Cycle</option>`;
      Object.keys(yearMap)
        .sort((a, b) => b - a)
        .forEach((year) => {
          const opt = document.createElement("option");
          opt.value = year;
          opt.textContent = year;
          cycleSelect.appendChild(opt);
        });

      // Disable cycle dropdown initially
      yearSelect.disabled = true;

      // When year changes, update cycle dropdown
      cycleSelect.addEventListener("change", () => {
        const selectedYear = cycleSelect.value;
        yearSelect.innerHTML = `<option value="">Select Cycle</option>`;
        if (selectedYear && yearMap[selectedYear]) {
          yearMap[selectedYear].forEach((cy) => {
            const opt = document.createElement("option");
            opt.value = cy;
            opt.textContent = `Cycle ${cy}`;
            yearSelect.appendChild(opt);
          });
          yearSelect.disabled = false;
        } else {
          yearSelect.disabled = true;
        }
      });
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
        <td><button class="view-btn" data-id="${p._id}" style="color: red;">View</button></td>
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
              Authorization: `Bearer ${localStorage.getItem("token")}`,
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

    // Use displayData for consistent info
    const fullName = p.displayData?.residentName || "N/A";
    const age = p.displayData?.age ?? "N/A";
    const birthday = p.displayData?.birthday ?? "N/A";
    const sexAssignedAtBirth = p.displayData?.sexAssignedAtBirth ?? "N/A";
    const lgbtqClassification = p.displayData?.lgbtqClassification ?? "N/A";
    const idImage = p.displayData?.idImage
      ? `http://localhost:5000/uploads/lgbtq_id_images/${p.displayData.idImage}`
      : "/Frontend/assets/default-profile.png";

    // Header: just the name
    header.innerHTML = `
      <p style="font-size:1.2em; font-weight:bold; margin:0;">${fullName}</p>
    `;

    // Details: ID image in its own container, larger size
    details.innerHTML = `
      <div class="profile-info">
        <p><b class="label">Age:</b> ${age}</p>
        <hr>
        <p><b class="label">Sex Assigned at Birth:</b> ${sexAssignedAtBirth}</p>
        <hr>
        <p><b class="label">LGBTQ Classification:</b> ${lgbtqClassification}</p>
        <hr>
        <p><b class="label">Birthday:</b> ${birthday}</p>
        <hr>
        <p><b class="label">Email:</b> ${p.user?.email || "-"}</p>
        <hr>
        <div class="id-image-container" style="
          background: #f3f3f3;
          padding: 18px;
          border-radius: 12px;
          margin: 18px 0;
          text-align: left;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        ">
          <p style="color:#222; font-weight:bold; margin-bottom:12px;">Identification Card:</p>
          <div style="width:100%; display:flex; justify-content:center;">
            <img src="${idImage}" alt="ID Image"
              style="
                width:96%;
                max-width:480px;
                height:220px;
                object-fit:contain;
                background:#fff;
                border-radius:6px;
                box-shadow:0 1px 6px rgba(0,0,0,0.08);
                display:block;
              " />
          </div>
        </div>
        <hr>
      </div>
    `;

    modal.style.display = "flex";
    document.querySelector(".close-btn").onclick = () =>
      (modal.style.display = "none");
  }

  // 🔹 Cycle filter
  filterBtn.addEventListener("click", () => {
    // Only allow cycle if year is selected
    currentFilters.year = cycleSelect.value || "";
    currentFilters.cycle = currentFilters.year ? yearSelect.value || "" : "";
    fetchProfiles(currentFilters);
  });

  // 🔹 Classification dropdown
  const dropdownButton = document.querySelector(".dropdown-button");
  const dropdownContent = document.querySelector(".dropdown-content");
  const classifications = [
    "Lesbian",
    "Gay",
    "Bisexual",
    "Transgender",
    "Queer",
    "Intersex",
    "Asexual",
    "Other",
  ];

  // Populate dropdown
  classifications.forEach((c) => {
    const option = document.createElement("a");
    option.href = "#";
    option.textContent = c;
    option.addEventListener("click", () => {
      dropdownButton.textContent = c;
      currentFilters.lgbtqClassification = c;
      // Reset year/cycle if not selected
      if (!currentFilters.year) currentFilters.cycle = "";
      fetchProfiles(currentFilters);
    });
    dropdownContent.appendChild(option);
  });

  // Add "All" option
  const allOption = document.createElement("a");
  allOption.href = "#";
  allOption.textContent = "All Classifications";
  allOption.addEventListener("click", () => {
    dropdownButton.textContent = "Select Classification";
    currentFilters.lgbtqClassification = "";
    fetchProfiles(currentFilters);
  });
  dropdownContent.insertBefore(allOption, dropdownContent.firstChild);

  // 🔹 Search filter
  searchInput.addEventListener("keyup", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const filteredProfiles = allProfiles.filter((p) => {
      return (
        (p.displayData?.residentName &&
          p.displayData.residentName.toLowerCase().includes(searchTerm)) ||
        (p.displayData?.purok &&
          p.displayData.purok.toLowerCase().includes(searchTerm)) ||
        (p.displayData?.lgbtqClassification &&
          p.displayData.lgbtqClassification.toLowerCase().includes(searchTerm))
      );
    });
    renderProfiles(filteredProfiles);
  });

  // Helper to format date/time
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  function updateDateTime() {
    const options = { timeZone: "Asia/Manila" };
    const now = new Date(new Date().toLocaleString("en-US", options));
    const hours = now.getHours();

    let greeting = "Good evening";
    let iconClass = "fa-solid fa-moon";
    let iconColor = "#183153";
    if (hours < 12) {
      iconClass = "fa-solid fa-sun";
      iconColor = "#f7c948";
      greeting = "Good morning";
    } else if (hours < 18) {
      iconClass = "fa-solid fa-cloud-sun";
      iconColor = "#f7c948";
      greeting = "Good afternoon";
    }

    // Format date as "January 25, 2025"
    const dateStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila"
    });

    // Format time as hh:mm (24-hour)
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;

    document.getElementById("greeting").textContent = greeting;
    document.getElementById("header-date").textContent = dateStr + " -";
    document.getElementById("datetime").textContent = timeStr;

    // Update icon
    const icon = document.getElementById("greeting-icon");
    icon.className = iconClass;
    icon.style.color = iconColor;
  }

  // Initial call
  updateDateTime();
  // Update every second
  setInterval(updateDateTime, 1000);

  // 🔹 Initial load
  fetchCycles();
  fetchProfiles();
});

// Helper: Capitalize first letter
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
