// kkprofile.js

// 🔹 Redirect to login if no token
if (!localStorage.getItem("token")) {
  window.location.href = "/Frontend/html/admin/admin-log.html";
}

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("kkprofile.js loaded ✅");

  const tableBody = document.querySelector(".tables tbody");
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");
  const classificationDropdown = document.getElementById("classificationDropdown");
  const classificationButton = classificationDropdown.querySelector(".dropdown-button");
  const classificationContent = classificationDropdown.querySelector(".dropdown-content");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {};

  let latestYear = null;
  let latestCycle = null;

  // 🔹 Fetch cycles


  // Fetch cycles and populate year dropdown

  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/kk", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch cycles");


      const cycles = await res.json();

      const yearMap = {};
      cycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });

      const sortedYears = Object.keys(yearMap).sort((a, b) => b - a);
      latestYear = sortedYears[0];
      latestCycle = Math.max(...yearMap[latestYear]);

      yearSelect.innerHTML = `<option value="">Select Year</option>`;
      sortedYears.forEach((year) => {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
      });

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
          currentFilters.cycle = undefined;
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

  // Dropdown open/close logic
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

  // 🔹 Fetch profiles
  async function fetchProfiles(params = {}) {
    try {

      // Build query string properly

      const query = new URLSearchParams(params).toString();
      const url = query
        ? `http://localhost:5000/api/kkprofiling?${query}`
        : `http://localhost:5000/api/kkprofiling`;


      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,

      console.log("🔎 Request URL:", url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // keep your auth

        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      allProfiles = data;

      renderProfiles(data);

      console.log("✅ Profiles fetched:", data);
      renderProfiles(data); // render table

    } catch (err) {
      console.error("❌ Error fetching profiles:", err);
    }
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // 🔹 Render profiles
  function renderProfiles(profiles) {
    tableBody.innerHTML = "";
    if (!profiles.length) {
      tableBody.innerHTML = `<tr><td colspan="6">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const lastname = p.lastname ? capitalize(p.lastname.trim()) : "";
      const firstname = p.firstname ? capitalize(p.firstname.trim()) : "";
      const middlename =
        p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
      const suffix =
        p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
      const fullName =
        lastname || firstname
          ? `${lastname}, ${firstname} ${middlename} ${suffix}`
              .replace(/\s+/g, " ")
              .trim()
          : "N/A";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${fullName}</td>
        <td>${p.user?.age ?? "N/A"}</td>
        <td>${p.purok || "-"}</td>
        <td>${p.gender}</td>
        <td><button class="view-btn" data-id="${p._id}"><i class="fa-solid fa-eye" style = "color: #ffffffff"></i> Review</button></td>
      `;
      tableBody.appendChild(row);
    });

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

  // 🔹 Show profile modal
  function showProfileModal(p) {
    const modal = document.getElementById("profileModal");
    const header = document.getElementById("profileHeader");
    const details = document.getElementById("profileDetails");

    const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
    const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
    const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

    fetch(`http://localhost:5000/api/kkprofiling/image/${p._id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Image not found");
        return res.blob();
      })
      .then((blob) => {
        const imgUrl = URL.createObjectURL(blob);
        header.innerHTML = `
          <img src="${imgUrl}" alt="Profile Image" width="60" height="60"
            style="border-radius:50%; object-fit:cover; margin-right:10px; margin-top: -5%" />
          <p style="display:inline-block; vertical-align:middle; margin-top: -50px;">${fullName}</p>
        `;
      })
      .catch(() => {
        header.innerHTML = `
          <img src="/Frontend/assets/default-profile.png" alt="Profile Image" width="60" height="60"
            style="border-radius:50%; object-fit:cover; margin-right:10px; margin-top:10%" />
          <p style="display:inline-block; vertical-align:middle;">${fullName}</p>
        `;
      });

    details.innerHTML = `
      <div class="profile-info">
        <p><b class="label">Address:</b> ${p.purok ? `Purok ${p.purok}` : ""}, ${p.barangay || ""}, ${p.municipality || ""}, ${p.province || ""}</p>
        <hr>
        <div style="display: flex; gap: 24px;">
          <p><b class="label">Age:</b> ${p.user?.age ?? "N/A"}</p>
          <p><b class="label">Gender:</b> ${p.gender}</p>
          <p><b class="label">Birthday:</b> ${
            p.user?.birthday
              ? new Date(p.user.birthday).toISOString().split("T")[0]
              : "-"
          }</p>
        </div>
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
        <p><b class="label">Registered SK Voter:</b> ${
          p.registeredSKVoter ? "Yes" : "No"
        }</p>
        <hr>
        <p><b class="label">Registered National Voter:</b> ${
          p.registeredNationalVoter ? "Yes" : "No"
        }</p>
        <hr>
        <p><b class="label">Voted Last SK Election:</b> ${
          p.votedLastSKElection ? "Yes" : "No"
        }</p>
        <hr>
        <p><b class="label">Already Attended KK Assembly:</b> ${
          p.attendedKKAssembly ? "Yes" : "No"
        }</p>
        <hr>
        ${
          p.attendedKKAssembly
            ? `<p><b>How many times:</b> ${p.attendanceCount || "-"}</p>`
            : `<p><b>If No, Why:</b> ${p.nowhy || "-"} </p>`
        }
        <hr>
        <p class="bott"></p>
      </div>
    `;

    // 🔹 Add Export to Word button
    // const exportBtn = document.createElement("button");
    // exportBtn.textContent = "Download Word File";
    // exportBtn.classList.add("export-btn");

    // document.querySelector(".bott").appendChild(exportBtn);

    // exportBtn.onclick = async () => {
    //   try {
    //     const res = await fetch(
    //       `http://localhost:5000/api/kkprofiling/export/${p._id}`,
    //       {
    //         headers: {
    //           Authorization: `Bearer ${localStorage.getItem("token")}`,
    //         },
    //       }
    //     );

    //     if (!res.ok) throw new Error("Failed to generate DOCX");

    //     const blob = await res.blob();
    //     const url = window.URL.createObjectURL(blob);
    //     const a = document.createElement("a");
    //     a.href = url;
    //     a.download = `${p.lastname}_${p.firstname}_KKProfile.docx`;
    //     document.body.appendChild(a);
    //     a.click();
    //     a.remove();
    //     window.URL.revokeObjectURL(url);
    //   } catch (err) {
    //     console.error("❌ Error exporting Word:", err);
    //     alert("Failed to export Word document");
    //   }
    // };

    const printBtn = document.getElementById("downloadDocx");
    if (printBtn) {
      printBtn.onclick = async () => {
        try {
          const res = await fetch(
            `http://localhost:5000/api/kkprofiling/export/${p._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (!res.ok) throw new Error("Failed to generate DOCX");

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${p.lastname}_${p.firstname}_KKProfile.docx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
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

  // 🔹 Filters
  filterBtn.addEventListener("click", () => {
    currentFilters.year = yearSelect.value || latestYear;
    currentFilters.cycle = cycleSelect.value || latestCycle;

    // If year/cycle not selected, use latest
    currentFilters.year = yearDropdown.value || latestYear;
    currentFilters.cycle = cycleDropdown.value || latestCycle;

    fetchProfiles(currentFilters);
  });

  searchInput.addEventListener("keyup", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredProfiles = allProfiles.filter((p) => {

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

  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.getDate();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  }

  // 🔹 Dropdown filters setup
  const filterOptions = {
    "Work Status": [
      "Employed",
      "Unemployed",
      "Self-Employed",
      "Currently looking for a Job",
      "Not interested in looking for a Job",
    ],
    "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
    "Educational Background": [
      "Elementary Undergraduate",
      "Elementary Graduate",
      "High School Undergraduate",
      "High School Graduate",
      "Vocational Graduate",
      "College Undergraduate",
      "College Graduate",
      "Masters Graduate",
      "Doctorate Level",
      "Doctorate Graduate",
    ],
    "Civil Status": [
      "Single",
      "Live-in",
      "Married",
      "Unknown",
      "Separated",
      "Annulled",
      "Divorced",
      "Widowed",
    ],
    "Youth Classification": [
      "In School Youth",
      "Out of School Youth",
      "Working Youth",
      "Youth with Specific Needs",
    ],
    Purok: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "Registered SK Voter": ["true", "false"],
    "Registered National Voter": ["true", "false"],
    "Voted Last SK Election": ["true", "false"],
  };

  const classificationBtn = document.getElementById("classificationDropdown");
  const classificationContent =
    classificationDropdown.querySelector(".dropdown-content");

  Object.keys(filterOptions).forEach((cat) => {
    const parent = document.createElement("div");
    parent.classList.add("submenu");

    const catItem = document.createElement("a");
    catItem.textContent = cat;
    catItem.href = "#";
    parent.appendChild(catItem);

    const subMenu = document.createElement("div");
    subMenu.classList.add("submenu-content");

    filterOptions[cat].forEach((opt) => {
      const g = document.createElement("a");
      g.textContent = opt;
      g.href = "#";
      g.onclick = async (e) => {
        e.preventDefault();
        if (cat === "Work Status") currentFilters.workStatus = opt;
        if (cat === "Youth Age Group") currentFilters.youthAgeGroup = opt;
        if (cat === "Educational Background")
          currentFilters.educationalBackground = opt;
        if (cat === "Civil Status") currentFilters.civilStatus = opt;
        if (cat === "Youth Classification")
          currentFilters.youthClassification = opt;
        if (cat === "Purok") currentFilters.purok = opt;
        if (cat === "Registered SK Voter")
          currentFilters.registeredSKVoter = opt;
        if (cat === "Registered National Voter")
          currentFilters.registeredNationalVoter = opt;
        if (cat === "Voted Last SK Election")
          currentFilters.votedLastSKElection = opt;

        if (!currentFilters.year || !currentFilters.cycle) {
          try {
            const res = await fetch("http://localhost:5000/api/formcycle/kk", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });
            const cycles = await res.json();
            const openCycle = cycles.find((c) => c.isOpen);
            if (openCycle) {
              currentFilters.year = openCycle.year;
              currentFilters.cycle = openCycle.cycleNumber;
            }
          } catch (err) {
            console.error("❌ Error fetching current cycle:", err);
          }
        }

        classificationContent.style.display = "none";
      };
      subMenu.appendChild(g);
    });

    parent.appendChild(subMenu);
    classificationContent.appendChild(parent);
  });

  classificationBtn
    .querySelector(".dropdown-button")
    .addEventListener("click", () => {
      classificationContent.style.display =
        classificationContent.style.display === "block" ? "none" : "block";
    });

  window.addEventListener("click", (e) => {
    if (!classificationBtn.contains(e.target)) {
      classificationContent.style.display = "none";
    }
  });

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

    const weekday = now.toLocaleString("en-US", {
      weekday: "long",
      timeZone: "Asia/Manila",
    });
    const dateStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila",
    });

    let hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    const timeStr = `${hour}:${minute} ${ampm}`;

    document.getElementById("greeting").textContent = greeting;
    document.getElementById(
      "header-date"
    ).textContent = `${weekday}, ${dateStr} -`;
    document.getElementById("datetime").textContent = timeStr;

    const icon = document.getElementById("greeting-icon");
    icon.className = iconClass;
    icon.style.color = iconColor;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  fetchCycles();
  fetchProfiles();

    renderProfiles(filteredProfiles);
  });

  // Helper to format date/time (used only for profile modal birthday)
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);

    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  }

  // 🔹 Available filter options
  const filterOptions = {
    "Work Status": ["Employed", "Unemployed", "Self-Employed", "Currently looking for a Job", "Not interested in looking for a Job"],
    "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
    "Educational Background": ["Elementary Undergraduate", "Elementary Graduate", "High School Undergraduate", "High School Graduate", "Vocational Graduate", "College Undergraduate", "College Graduate", "Masters Graduate", "Doctorate Level", "Doctorate Graduate"],
    "Civil Status": ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
    "Youth Classification": ["In School Youth","Out of School Youth","Working Youth","Youth with Specific Needs"],
    "Purok": ["1","2","3","4","5","6","7","8","9","10"],
    "Registered SK Voter": ["true", "false"],
    "Registered National Voter": ["true", "false"],
    "Voted Last SK Election": ["true", "false"],
  };

  // Classification logic (keep your existing submenu logic)
  // Only allow one classification filter at a time
  Object.keys(filterOptions).forEach((cat) => {
    filterOptions[cat].forEach((opt) => {
      setTimeout(() => {
        const links = Array.from(classificationDropdown.querySelectorAll(".submenu-content a"));
        links.forEach(link => {
          if (link.textContent === opt) {
            link.addEventListener("click", () => {
              // Clear all classification filters before setting a new one
              delete currentFilters.workStatus;
              delete currentFilters.youthAgeGroup;
              delete currentFilters.educationalBackground;
              delete currentFilters.civilStatus;
              delete currentFilters.youthClassification;
              delete currentFilters.purok;
              delete currentFilters.registeredSKVoter;
              delete currentFilters.registeredNationalVoter;
              delete currentFilters.votedLastSKElection;

              // Set only the selected classification filter
              if (cat === "Work Status") currentFilters.workStatus = opt;
              if (cat === "Youth Age Group") currentFilters.youthAgeGroup = opt;
              if (cat === "Educational Background") currentFilters.educationalBackground = opt;
              if (cat === "Civil Status") currentFilters.civilStatus = opt;
              if (cat === "Youth Classification") currentFilters.youthClassification = opt;
              if (cat === "Purok") currentFilters.purok = opt;
              if (cat === "Registered SK Voter") currentFilters.registeredSKVoter = opt;
              if (cat === "Registered National Voter") currentFilters.registeredNationalVoter = opt;
              if (cat === "Voted Last SK Election") currentFilters.votedLastSKElection = opt;

              // Change button text to selected classification
              classificationButton.textContent = opt;

              classificationContent.style.display = "none";
            });
          }
        });
      }, 500);
    });
  });

  // Build classification dropdown (submenu structure)
  classificationContent.innerHTML = ""; // Clear first
  Object.keys(filterOptions).forEach((cat) => {
    // Parent container
    const parent = document.createElement("div");
    parent.classList.add("submenu");

    // Top-level item (category)
    const catItem = document.createElement("a");
    catItem.textContent = cat;
    catItem.href = "#";
    parent.appendChild(catItem);

    // Submenu container
    const subMenu = document.createElement("div");
    subMenu.classList.add("submenu-content");

    // Build groups inside submenu
    filterOptions[cat].forEach((opt) => {
      const g = document.createElement("a");
      g.textContent = opt;
      g.href = "#";
      g.className = "dropdown-option";
      subMenu.appendChild(g);
    });

    parent.appendChild(subMenu);
    classificationContent.appendChild(parent);
  });

  // Only run filter when filter button is clicked
  filterBtn.addEventListener("click", () => {
    // Require year and cycle for any filter
    if (!currentFilters.year || !currentFilters.cycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }

    // If classification is set, year and cycle are already required above
    fetchProfiles(currentFilters);
  });

  // Clear filter resets everything
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    classificationButton.disabled = true;
    classificationButton.textContent = "Classification";
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";

    // Reset filters
    currentFilters = {};

    // Fetch all profiles (no filters)
    fetchProfiles({});
  });

  // 🔹 Initial load
  fetchCycles(); // load year + cycle dropdowns
  fetchProfiles(); // load profiles

  // Disable year and cycle selects initially
  yearDropdown.disabled = true;
  cycleDropdown.disabled = true;



  yearDropdown.disabled = false; // Year is a lways enabled
  cycleDropdown.disabled = true;
  classificationDropdown.querySelector('.dropdown-button').disabled = true;

  // Enable cycle after year is selected
  yearDropdown.addEventListener("change", () => {
    if (yearDropdown.value) {
      cycleDropdown.disabled = false;
      cycleDropdown.value = "";
      classificationDropdown.querySelector('.dropdown-button').disabled = true;

      // Repopulate cycle options for selected year ONLY
      const selectedYear = yearDropdown.value;
      cycleDropdown.querySelector(".dropdown-content").innerHTML = `<option value="">Select Cycle</option>`;
      if (selectedYear && yearMap[selectedYear]) {
        yearMap[selectedYear].forEach((cy) => {
          const opt = document.createElement("option");
          opt.value = cy;
          opt.textContent = `Cycle ${cy}`;
          cycleDropdown.querySelector(".dropdown-content").appendChild(opt);
        });
      }
    } else {
      cycleDropdown.disabled = true;
      cycleDropdown.value = "";
      classificationDropdown.querySelector('.dropdown-button').disabled = true;
    }
  });

  // Enable classification after cycle is selected
  cycleDropdown.addEventListener("change", () => {
    if (cycleDropdown.value) {
      classificationDropdown.querySelector('.dropdown-button').disabled = false;
    } else {
      classificationDropdown.querySelector('.dropdown-button').disabled = true;
    }
  });

});
