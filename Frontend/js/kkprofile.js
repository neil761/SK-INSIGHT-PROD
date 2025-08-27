// kkprofile.js

// 🔹 Redirect to login if no token
if (!localStorage.getItem("token")) {
  window.location.href = "/html/admin-log.html";
}

let allProfiles = [];

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
  async function fetchProfiles(params = {}) {
  try {
    // Build query string properly
    const query = new URLSearchParams(params).toString();
    const url = query
      ? `http://localhost:5000/api/kkprofiling?${query}`
      : `http://localhost:5000/api/kkprofiling`;

    console.log("🔎 Request URL:", url);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // keep your auth
      },
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    allProfiles = data;
    console.log("✅ Profiles fetched:", data);
    renderProfiles(data); // render table
  } catch (err) {
    console.error("❌ Error fetching profiles:", err);
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
  const header = document.getElementById("profileHeader");
  const details = document.getElementById("profileDetails");

  const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
  const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
  const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

  // 🔹 Put image + name in header
  header.innerHTML = `
    <img src="${p.profileImage || 'default.jpg'}" alt="Profile Image" width="60" height="60" style="border-radius:50%; object-fit:cover; margin-right:10px; margin-top:10%" />
    <p style="display:inline-block; vertical-align:middle;">${fullName}</p>
  `;

  // 🔹 Fill the rest of the details in body
  details.innerHTML = `
    <div class="profile-info">
      <p><b class="label">Address:</b> ${p.purok ? `Purok ${p.purok}` : ""}, ${p.barangay || ""}, ${p.municipality || ""}, ${p.province || ""}</p>
      <hr>
      <p><b class="label">Age:</b> ${p.age}</p>
      <hr>
      <p><b class="label">Gender:</b> ${p.gender}</p>
      <hr>
      <p><b class="label">Birthday:</b> ${p.birthday ? new Date(p.birthday).toISOString().split("T")[0] : "-"}</p>
      <hr>
      <p><b class="label">Email:</b> ${p.email || "-"}</p>
      <hr>
      <p><b class="label">Contact Number:</b> ${p.contactNumber || "-"}</p>
      <hr>
      <p><b class="label">Civil Status:</b> ${p.civilStatus || "-"}</p>
      <hr>
      <p><b class="label">Youth Age Group:</b> ${p.youthAgeGroup || "-"}</p>
      <hr>
      <p><b class="label">Youth Classification:</b> ${p.youthClassification || "-"}</p>
      <hr>
      <p><b class="label">Educational Background:</b> ${p.educationalBackground || "-"}</p>
      <hr>
      <p><b class="label">Work Status:</b> ${p.workStatus || "-"}</p>
      <hr>
      <p><b class="label">Registered SK Voter:</b> ${p.registeredSKVoter ? "Yes" : "No"}</p>
      <hr>
      <p><b class="label">Registered National Voter:</b> ${p.registeredNationalVoter ? "Yes" : "No"}</p>
      <hr>
      <p><b class="label">Voted Last SK Election:</b> ${p.votedLastSKElection ? "Yes" : "No"}</p>
      <hr>
      <p><b class="label">Already Attended KK Assembly:</b> ${p.attendedKKAssembly ? "Yes" : "No"}</p>
      <hr>
      ${p.attendedKKAssembly ? `<p><b>How many times:</b> ${p.attendanceCount || "-"}</p>` : `<p><b>If No, Why:</b> ${p.nowhy || "-"}</p>`}
      <hr>
      <p class="bott"></p>
    </div>
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
  const searchTerm = searchInput.value.trim().toLowerCase();

  const filteredProfiles = allProfiles.filter(p => {
    return (
      (p.firstname && p.firstname.toLowerCase().includes(searchTerm)) ||
      (p.middlename && p.middlename.toLowerCase().includes(searchTerm)) ||
      (p.lastname && p.lastname.toLowerCase().includes(searchTerm)) ||
      (p.barangay && p.barangay.toLowerCase().includes(searchTerm)) ||
      (p.purok && p.purok.toLowerCase().includes(searchTerm))
    );
  });

  renderProfiles(filteredProfiles);
});



  // 🔹 Available filter options
  const filterOptions = {
    "Work Status": ["Employed", "Unemployed", "Self-Employed", "Currently looking for a Job", "Not interested in looking for a Job"],
    "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
    "Educational Background": ["Elementary Undergraduate", "Elementary Graduate", "High School Undergraduate", "High School Graduate", "Vocational Graduate", "College Undergraduate", "College Graduate", "Masters Graduate", "Doctorate Level", "Doctorate Graduate"],
    "Civil Status": ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
    "Youth Classification": [
      "In School Youth",
      "Out of School Youth",
      "Working Youth",
      "Youth with Specific Needs"
    ],
    Purok: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
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
