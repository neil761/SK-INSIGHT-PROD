document.addEventListener("DOMContentLoaded", () => {
  // Custom dropdown filter logic (like KK Profile)
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {};

  // Fetch cycles and populate year dropdown
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
      const cycles = await res.json();
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

          // Reset cycle
          cycleButton.textContent = "Cycle";
          currentFilters.cycle = undefined;
          cycleButton.disabled = false;

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
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

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
  });
  cycleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cycleButton.disabled) {
      cycleContent.style.display = cycleContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
    }
  });
  window.addEventListener("click", () => {
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
  });

  // Filter button logic
  filterBtn.addEventListener("click", () => {
    if (!currentFilters.year || !currentFilters.cycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }
    updateDashboard(currentFilters.year, currentFilters.cycle);
  });

  // Clear filter resets everything
  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    currentFilters = {};
    updateDashboard(); // Show present profiling
  });


  const chartConfigs = {};

  // Chart.js chart instances
  let genderChart, ageChart, civilStatusChart, educationChart, employmentChart, skVoterChart, assemblyChart, purokChart;

  // Color palette for SK Insight
  const palette = [
    "#07B0F2", "#0A2C59", "#FED600", "#ef4444", "#22c55e", "#6366f1", "#f59e42", "#f472b6", "#a3e635"
  ];

  // Fetch profiling data for selected cycle (using year & cycle)
  // If no year/cycle, fetch present profiling (default)
  async function fetchProfilingData(year, cycle) {
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      window.location.href = "/Frontend/html/admin/admin-log.html";
      return {};
    }
    let url = "http://localhost:5000/api/kkprofiling";
    if (year && cycle) {
      url += `?year=${year}&cycle=${cycle}`;
    }
    const res = await fetch(url, {
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
    // If no year/cycle, fetch present profiling
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

    // Update chart info (e.g., totals, majorities)
    updateChartInfo(data);
  }

  // Add this function at the end of your file
  function initPredictionChart() {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    // Placeholder data
    const actualData = [65, 78, 82, 75, 85, 92, 88, 95];
    const predictedData = [null, null, null, 79, 88, 95, 98, 102];
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Actual Data',
            data: actualData,
            borderColor: '#07B0F2',
            backgroundColor: 'rgba(7,176,242,0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Predicted Trend',
            data: predictedData,
            borderColor: '#FED600',
            backgroundColor: 'rgba(254,214,0,0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(255,255,255,0.9)',
            titleColor: '#0A2C59',
            bodyColor: '#0A2C59',
            borderColor: '#e1e8ff',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { borderDash: [4, 4] } }
        }
      }
    });
  }

  // Call this after other charts are initialized
  initPredictionChart();

  // Example: Update chart info for Gender Distribution
  function updateChartInfo(data) {
    // Gender
    const genderTotal = Object.values(data.gender || {}).reduce((a, b) => a + b, 0);
    document.getElementById('genderTotal').textContent = genderTotal;
    const majority = Object.entries(data.gender || {}).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('genderMajority').textContent = majority ? majority[0] : '-';

    // Repeat for other charts: age, civil status, etc.
  }

  // Initial load
  fetchCycles();
  updateDashboard(); // Show present profiling by default
});