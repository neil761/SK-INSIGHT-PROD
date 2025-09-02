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
      tableBody.innerHTML = `<tr><td colspan="6">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${p.displayData?.residentName || "N/A"}</td>
        <td>${p.displayData?.age ?? "N/A"}</td>
        <td>${p.displayData?.purok ?? "N/A"}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
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

    const info = p.kkInfo || p;
    const fullName = p.displayData?.residentName ||
      (info.lastname && info.firstname
        ? `${info.firstname} ${info.middlename ? info.middlename + " " : ""}${info.lastname}`
        : "N/A");

    header.innerHTML = `
      <img src="${p.idImage ? 'http://localhost:5000/' + p.idImage.replace(/\\/g, "/") : '/Frontend/assets/id.jpg'}" 
       alt="Profile Image" 
       width="60" height="60" 
       style="border-radius:50%; object-fit:cover; margin-right:10px; margin-top:10%" />
      <p style="display:inline-block; vertical-align:middle;">${fullName}</p>
    `;

    details.innerHTML = `
      <div class="profile-info">
        <p><b class="label">Address:</b> ${info.purok || p.displayData?.purok || ""}, ${info.barangay || ""}, ${info.municipality || ""}, ${info.province || ""}</p>
        <hr>
        <p><b class="label">Age:</b> ${info.age ?? p.displayData?.age ?? "-"}</p>
        <hr>
        <p><b class="label">Sex Assigned at Birth:</b> ${p.sexAssignedAtBirth || "-"}</p>
        <hr>
        <p><b class="label">LGBTQ Classification:</b> ${p.lgbtqClassification || p.displayData?.lgbtqClassification || "-"}</p>
        <hr>
        <p><b class="label">Birthday:</b> ${
          info.birthday
            ? new Date(info.birthday).toISOString().split("T")[0]
            : "-"
        }</p>
        <hr>
        <p><b class="label">Email:</b> ${p.user?.email || "-"}</p>
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

  // 🔹 Initial load
  fetchCycles();
  fetchProfiles();
});

// Helper: Capitalize first letter
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
