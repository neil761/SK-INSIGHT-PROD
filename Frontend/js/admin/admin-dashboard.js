document.addEventListener("DOMContentLoaded", () => {
  // Add year and cycle dropdowns
  const dashboardControls = document.querySelector(".dashboard-controls");
  dashboardControls.innerHTML = `
    <label for="yearDropdown" class="cycle-label">
      <i class="fas fa-calendar"></i> Year:
    </label>
    <select id="yearDropdown" class="cycle-dropdown"></select>
    <label for="cycleDropdown" class="cycle-label">
      <i class="fas fa-sync-alt"></i> Cycle:
    </label>
    <select id="cycleDropdown" class="cycle-dropdown" disabled></select>
  `;

  const yearDropdown = document.getElementById("yearDropdown");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const chartConfigs = {};

  // Chart.js chart instances
  let genderChart, ageChart, civilStatusChart, educationChart, employmentChart, skVoterChart, assemblyChart, purokChart;

  // Color palette for SK Insight
  const palette = [
    "#07B0F2", "#0A2C59", "#FED600", "#ef4444", "#22c55e", "#6366f1", "#f59e42", "#f472b6", "#a3e635"
  ];

  // Fetch available cycles for dropdown
  async function fetchCycles() {
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      window.location.href = "/Frontend/html/admin/admin-log.html";
      return [];
    }
    const res = await fetch("http://localhost:5000/api/formcycle/kk", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert("Session expired or unauthorized. Please log in again.");
        window.location.href = "/Frontend/html/admin/admin-log.html";
        return [];
      }
      console.error("Failed to fetch cycles:", res.status);
      return [];
    }
    try {
      return await res.json();
    } catch (err) {
      console.error("Invalid JSON response for cycles");
      return [];
    }
  }

  // Fetch profiling data for selected cycle (using year & cycle)
  async function fetchProfilingData(year, cycle) {
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      window.location.href = "/Frontend/html/admin/admin-log.html";
      return {};
    }
    const res = await fetch(`http://localhost:5000/api/kkprofiling?year=${year}&cycle=${cycle}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert("Session expired or unauthorized. Please log in again.");
        window.location.href = "/Frontend/html/admin/admin-log.html";
        return {};
      }
      console.error("Failed to fetch profiling data:", res.status);
      return {};
    }
    return await res.json();
  }

  // Chart rendering helpers
  function renderPieChart(ctx, labels, data, colors, title) {
    if (chartConfigs[ctx]) chartConfigs[ctx].destroy();
    chartConfigs[ctx] = new Chart(document.getElementById(ctx), {
      type: "pie",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: false }
        }
      }
    });
  }

  function renderDonutChart(ctx, labels, data, colors) {
    if (chartConfigs[ctx]) chartConfigs[ctx].destroy();
    chartConfigs[ctx] = new Chart(document.getElementById(ctx), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
        }]
      },
      options: {
        responsive: true,
        cutout: "60%",
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }

  function renderBarChart(ctx, labels, data, colors, stacked = false) {
    if (chartConfigs[ctx]) chartConfigs[ctx].destroy();
    chartConfigs[ctx] = new Chart(document.getElementById(ctx), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { stacked },
          y: { stacked, beginAtZero: true }
        }
      }
    });
  }

  function renderLineChart(ctx, labels, data, colors) {
    if (chartConfigs[ctx]) chartConfigs[ctx].destroy();
    chartConfigs[ctx] = new Chart(document.getElementById(ctx), {
      type: "line",
      data: {
        labels,
        datasets: [{
          data,
          borderColor: colors[0],
          backgroundColor: colors[0] + "33",
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Aggregate dashboard data from profiles
  function aggregateDashboardData(profiles) {
    // Helper to count occurrences
    const countBy = (arr, key) =>
      arr.reduce((acc, obj) => {
        const val = obj[key] || "Unknown";
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});

    return {
      gender: countBy(profiles, "gender"),
      ageGroups: countBy(profiles, "youthAgeGroup"),
      civilStatus: countBy(profiles, "civilStatus"),
      education: countBy(profiles, "educationalBackground"),
      employment: countBy(profiles, "workStatus"),
      skVoter: {
        Registered: profiles.filter(p => p.registeredSKVoter).length,
        NotRegistered: profiles.filter(p => !p.registeredSKVoter).length,
        Voted: profiles.filter(p => p.votedLastSKElection).length,
        DidNotVote: profiles.filter(p => !p.votedLastSKElection).length
      },
      assemblyAttendance: countBy(profiles, "attendanceCount"),
      purok: countBy(profiles, "purok")
    };
  }

  // Main dashboard update
  async function updateDashboard(year, cycle) {
    const profiles = await fetchProfilingData(year, cycle);
    if (!Array.isArray(profiles) || profiles.length === 0) {
      // Optionally clear charts or show "No data"
      return;
    }
    const data = aggregateDashboardData(profiles);

    // Use safe defaults to avoid breaking charts
    const gender = data.gender || {};
    const ageGroups = data.ageGroups || {};
    const civilStatus = data.civilStatus || {};
    const education = data.education || {};
    const employment = data.employment || {};
    const skVoter = data.skVoter || {};
    const assemblyAttendance = data.assemblyAttendance || {};
    const purok = data.purok || {};

    // Gender Pie
    renderPieChart(
      "genderChart",
      Object.keys(gender),
      Object.values(gender),
      palette,
      "Gender Distribution"
    );

    // Age Bar
    renderBarChart(
      "ageChart",
      Object.keys(ageGroups),
      Object.values(ageGroups),
      palette
    );

    // Civil Status Donut
    renderDonutChart(
      "civilStatusChart",
      Object.keys(civilStatus),
      Object.values(civilStatus),
      palette
    );

    // Education Bar
    renderBarChart(
      "educationChart",
      Object.keys(education),
      Object.values(education),
      palette
    );

    // Employment Pie
    renderPieChart(
      "employmentChart",
      Object.keys(employment),
      Object.values(employment),
      palette
    );

    // SK Voter Bar
    renderBarChart(
      "skVoterChart",
      Object.keys(skVoter),
      Object.values(skVoter),
      palette
    );

    // Assembly Stacked Bar
    renderBarChart(
      "assemblyChart",
      Object.keys(assemblyAttendance),
      Object.values(assemblyAttendance),
      palette,
      true
    );

    // Purok Bar
    renderBarChart(
      "purokChart",
      Object.keys(purok),
      Object.values(purok),
      palette
    );
  }

  // Initial load
  let cyclesData = [];
  let yearMap = {};
  let sortedYears = [];

  fetchCycles().then(cycles => {
    // Group cycles by year
    yearMap = {};
    cycles.forEach((c) => {
      if (!yearMap[c.year]) yearMap[c.year] = [];
      yearMap[c.year].push(c.cycleNumber || c.cycle || c.cycle_id);
    });

    sortedYears = Object.keys(yearMap).sort((a, b) => b - a);

    // Populate year dropdown
    yearDropdown.innerHTML = `<option value="">Select Year</option>`;
    sortedYears.forEach(year => {
      yearDropdown.innerHTML += `<option value="${year}">${year}</option>`;
    });

    // Disable cycle dropdown until year is selected
    cycleDropdown.innerHTML = `<option value="">Select Cycle</option>`;
    cycleDropdown.disabled = true;
  });

  // When year changes, populate cycle dropdown
  yearDropdown.addEventListener("change", () => {
    const selectedYear = yearDropdown.value;
    if (selectedYear && yearMap[selectedYear]) {
      cycleDropdown.innerHTML = `<option value="">Select Cycle</option>`;
      yearMap[selectedYear].forEach(cycleNum => {
        cycleDropdown.innerHTML += `<option value="${cycleNum}">Cycle ${cycleNum}</option>`;
      });
      cycleDropdown.disabled = false;
    } else {
      cycleDropdown.innerHTML = `<option value="">Select Cycle</option>`;
      cycleDropdown.disabled = true;
    }
    // Optionally, clear charts when year changes
  });

  // When cycle changes, update dashboard
  cycleDropdown.addEventListener("change", () => {
    const selectedYear = yearDropdown.value;
    const selectedCycle = cycleDropdown.value;
    if (selectedYear && selectedCycle) {
      updateDashboard(selectedYear, selectedCycle);
    }
  });
});