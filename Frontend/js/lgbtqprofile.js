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

      // Populate yearSelect (Year dropdown)
      cycleSelect.innerHTML = `<option value="">Select Year</option>`;
      Object.keys(yearMap)
        .sort((a, b) => b - a)
        .forEach((year) => {
          const opt = document.createElement("option");
          opt.value = year;
          opt.textContent = year;
          cycleSelect.appendChild(opt);
        });

      // When year changes, update cycleSelect
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
        }
      });
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  // 🔹 Fetch profiles
async function fetchProfiles(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query
      ? `http://localhost:5000/api/lgbtqprofiling?${query}`
      : `http://localhost:5000/api/lgbtqprofiling`;

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
        <td>${p.displayData?.age || "N/A"}</td>
        <td>${p.displayData?.purok || "N/A"}</td>
        <td>${p.displayData?.lgbtqClassification || "N/A"}</td>
        <td><button class="view-btn" data-id="${p._id}">View</button></td>
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

    const fullName = p.kkInfo
      ? `${p.kkInfo.lastname}, ${p.kkInfo.firstname} ${
          p.kkInfo.middlename ? p.kkInfo.middlename[0].toUpperCase() + "." : ""
        }`
      : "N/A";

    header.innerHTML = `
      <img src="${p.idImage || "default.jpg"}" alt="Profile Image" width="60" height="60" style="border-radius:50%; object-fit:cover; margin-right:10px; margin-top:10%" />
      <p style="display:inline-block; vertical-align:middle;">${fullName}</p>
    `;

    details.innerHTML = `
      <div class="profile-info">
        <p><b class="label">Address:</b> ${p.kkInfo ? p.kkInfo.purok : ""}, ${p.kkInfo?.barangay || ""}, ${p.kkInfo?.municipality || ""}, ${p.kkInfo?.province || ""}</p>
        <hr>
        <p><b class="label">Age:</b> ${p.kkInfo?.age || "-"}</p>
        <hr>
        <p><b class="label">Gender:</b> ${p.kkInfo?.gender || "-"}</p>
        <hr>
        <p><b class="label">Sex Assigned at Birth:</b> ${p.sexAssignedAtBirth || "-"}</p>
        <hr>
        <p><b class="label">LGBTQ Classification:</b> ${p.lgbtqClassification || "-"}</p>
        <hr>
        <p><b class="label">Birthday:</b> ${
          p.kkInfo?.birthday
            ? new Date(p.kkInfo.birthday).toISOString().split("T")[0]
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
    currentFilters.year = cycleSelect.value || "";
    currentFilters.cycle = yearSelect.value || "";
    fetchProfiles(currentFilters);
  });

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

  // Add this inside DOMContentLoaded, after selecting cycle/year elements
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
    dropdownButton.textContent = c; // Show selected
    currentFilters.lgbtqClassification = c; // Save filter
    fetchProfiles(currentFilters); // Re-fetch
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



  // 🔹 Initial load
  fetchCycles();
  fetchProfiles();
});
