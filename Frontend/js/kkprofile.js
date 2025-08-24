// kkprofile.js

// 🔹 Redirect to login if no token
if (!localStorage.getItem("token")) {
  window.location.href = "/html/admin-log.html";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("kkprofile.js loaded ✅");

  const tableBody = document.querySelector(".tables tbody");
  const yearSelect = document.getElementById("yearSelect");
  const cycleSelect = document.getElementById("cycleSelect");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");
  const classificationDropdown = document.getElementById(
    "classificationDropdown"
  );
  const groupDropdown = document.getElementById("groupDropdown");

  let currentFilters = {};

  // 🔹 Fetch and populate available years & cycles
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/kk", {
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

      // Populate yearSelect
      yearSelect.innerHTML = `<option value="">Select Year</option>`;
      Object.keys(yearMap)
        .sort((a, b) => b - a) // descending
        .forEach((year) => {
          const opt = document.createElement("option");
          opt.value = year;
          opt.textContent = year;
          yearSelect.appendChild(opt);
        });

      // When year changes, update cycleSelect
      yearSelect.addEventListener("change", () => {
        const selectedYear = yearSelect.value;
        cycleSelect.innerHTML = `<option value="">Select Cycle</option>`;
        if (selectedYear && yearMap[selectedYear]) {
          yearMap[selectedYear].forEach((cy) => {
            const opt = document.createElement("option");
            opt.value = cy;
            opt.textContent = `Cycle ${cy}`;
            cycleSelect.appendChild(opt);
          });
        }
      });
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  // 🔹 Fetch profiles with filters
  async function fetchProfiles(filters = {}) {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(
        `http://localhost:5000/api/kkprofiling${query ? "?" + query : ""}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const profiles = await res.json();
      renderProfiles(profiles);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      tableBody.innerHTML = `<tr><td colspan="6">Error loading profiles</td></tr>`;
    }
  }

  // 🔹 Render profiles into table
  function renderProfiles(profiles) {
    tableBody.innerHTML = "";
    if (!profiles.length) {
      tableBody.innerHTML = `<tr><td colspan="6">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const suffix =
        p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
      const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
      const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${fullName}</td>
        <td>${p.age}</td>
        <td>${p.purok || "-"}</td>
        <td>${p.gender}</td>
        <td><button class="view-btn" data-id="${p._id}">View</button></td>
      `;
      tableBody.appendChild(row);
    });

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/kkprofiling/${btn.dataset.id}`,
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

  // 🔹 Show modal with profile details
  function showProfileModal(p) {
    const modal = document.getElementById("profileModal");
    const details = document.getElementById("profileDetails");
    const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
    const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";

    details.innerHTML = `
      <p><strong>Name:</strong> ${p.firstname} ${mi} ${p.lastname} ${suffix}</p>
      <p><strong>Age:</strong> ${p.age}</p>
      <p><strong>Gender:</strong> ${p.gender}</p>
      <p><strong>Purok:</strong> ${p.purok || "-"}</p>
      <p><strong>Status:</strong> ${p.civilStatus || "-"}</p>
    `;
    modal.style.display = "flex";
    document.querySelector(".close-btn").onclick = () =>
      (modal.style.display = "none");
  }

  // 🔹 Cycle filter (year + cycle)
  filterBtn.addEventListener("click", () => {
    currentFilters.year = yearSelect.value || "";
    currentFilters.cycle = cycleSelect.value || "";
    fetchProfiles(currentFilters);
  });

  // 🔹 Search filter
  searchInput.addEventListener("keyup", () => {
    currentFilters.search = searchInput.value.trim();
    fetchProfiles(currentFilters);
  });

  // 🔹 Available filter options
  const filterOptions = {
    "Work Status": ["Employed", "Unemployed", "Self-Employed"],
    "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
    "Educational Background": ["Elementary", "High School", "College"],
    "Civil Status": ["Single", "Married", "Widowed"],
    "Youth Classification": [
      "In School Youth",
      "Out of School Youth",
      "Working Youth",
    ],
    Purok: ["1", "2", "3", "4", "5"],
    "Registered SK Voter": ["true", "false"],
    "Registered National Voter": ["true", "false"],
    "Voted Last SK Election": ["true", "false"],
  };

  // 🔹 Classification dropdown setup
  const classificationBtn =
    classificationDropdown.querySelector(".dropdown-button");
  const classificationContent =
    classificationDropdown.querySelector(".dropdown-content");

  Object.keys(filterOptions).forEach((cat) => {
    const a = document.createElement("a");
    a.textContent = cat;
    a.href = "#";
    a.onclick = (e) => {
      e.preventDefault();
      classificationBtn.textContent = cat;
      buildGroupDropdown(cat);
      classificationContent.style.display = "none";
    };
    classificationContent.appendChild(a);
  });

  // 🔹 Build group dropdown options
  function buildGroupDropdown(category) {
    const groupContent = groupDropdown.querySelector(".dropdown-content");
    const groupBtn = groupDropdown.querySelector(".dropdown-buttons");
    groupContent.innerHTML = "";
    groupBtn.textContent = "Select Option";

    filterOptions[category].forEach((opt) => {
      const g = document.createElement("a");
      g.textContent = opt;
      g.href = "#";
      g.onclick = (e) => {
        e.preventDefault();
        groupBtn.textContent = opt;

        // 🧹 Clear old filters
        delete currentFilters.workStatus;
        delete currentFilters.youthAgeGroup;
        delete currentFilters.educationalBackground;
        delete currentFilters.civilStatus;
        delete currentFilters.youthClassification;
        delete currentFilters.purok;
        delete currentFilters.registeredSKVoter;
        delete currentFilters.registeredNationalVoter;
        delete currentFilters.votedLastSKElection;

        // ✅ Apply new filter
        currentFilters.all = "true";
        if (category === "Work Status") currentFilters.workStatus = opt;
        if (category === "Youth Age Group") currentFilters.youthAgeGroup = opt;
        if (category === "Educational Background")
          currentFilters.educationalBackground = opt;
        if (category === "Civil Status") currentFilters.civilStatus = opt;
        if (category === "Youth Classification")
          currentFilters.youthClassification = opt;
        if (category === "Purok") currentFilters.purok = opt;
        if (category === "Registered SK Voter")
          currentFilters.registeredSKVoter = opt;
        if (category === "Registered National Voter")
          currentFilters.registeredNationalVoter = opt;
        if (category === "Voted Last SK Election")
          currentFilters.votedLastSKElection = opt;

        fetchProfiles(currentFilters);
        groupContent.style.display = "none";
      };
      groupContent.appendChild(g);
    });
  }

  // 🔹 Dropdown toggles
  classificationBtn.addEventListener("click", () => {
    classificationContent.style.display =
      classificationContent.style.display === "block" ? "none" : "block";
  });

  groupDropdown
    .querySelector(".dropdown-buttons")
    .addEventListener("click", () => {
      const groupContent = groupDropdown.querySelector(".dropdown-content");
      groupContent.style.display =
        groupContent.style.display === "block" ? "none" : "block";
    });

  // 🔹 Close dropdowns on outside click
  window.addEventListener("click", (e) => {
    if (!classificationDropdown.contains(e.target)) {
      classificationContent.style.display = "none";
    }
    if (!groupDropdown.contains(e.target)) {
      groupDropdown.querySelector(".dropdown-content").style.display = "none";
    }
  });

  // 🔹 Initial load
  fetchCycles(); // load year + cycle dropdowns
  fetchProfiles(); // load profiles
});
