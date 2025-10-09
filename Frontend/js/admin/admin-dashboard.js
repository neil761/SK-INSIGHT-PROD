import { renderEducationalBackgroundBar } from '../charts/educational-background-chart.js';

document.addEventListener("DOMContentLoaded", () => {
  // Filter dropdown logic only
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
    // You can add logic here to update the prediction chart based on filter if needed
  });

  // Clear filter resets everything
  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    currentFilters = {};
    // You can add logic here to reset the prediction chart if needed
  });


  fetchCycles();
  initPredictionChart();
  renderCivilStatusDonutFromAPI(); // <-- Call this directly here
  renderEducationalBackgroundBar(); // Call the imported function

});

function renderCivilStatusDonutFromAPI(year, cycle) {
  const civilStatusCategories = [
    "Single", "Live-in", "Married", "Unknown", "Separated",
    "Annulled", "Divorced", "Widowed"
  ];
  const colors = [
    "#07B0F2", "#FED600", "#0A2C59", "#ef4444",
    "#22c55e", "#6366f1", "#f59e42", "#f472b6"
  ];

  const token = sessionStorage.getItem("token");
  if (!token) return;
  let url = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) url += `?year=${year}&cycle=${cycle}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(profiles => {
      // Count civil status
      const counts = civilStatusCategories.map(
        status => profiles.filter(p => p.civilStatus === status).length
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const percentages = counts.map(v => total ? ((v / total) * 100).toFixed(1) : "0.0");
      const mostCommonIdx = counts.indexOf(Math.max(...counts));
      const mostCommon = civilStatusCategories[mostCommonIdx] || "—";

      // Chart.js donut with center text for total respondents
      const canvas = document.getElementById("civilStatusDonut");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (window.civilStatusChart) window.civilStatusChart.destroy();
      window.civilStatusChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: civilStatusCategories,
          datasets: [{
            data: counts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#fff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const idx = context.dataIndex;
                  return `${civilStatusCategories[idx]}: ${counts[idx]} (${percentages[idx]}%)`;
                }
              }
            },
            doughnutCenter: {
              display: true,
              text1: "Total",
              text2: total
            }
          }
        },
        plugins: [{
          id: 'doughnutCenter',
          afterDraw: function(chart) {
            const opts = chart.options.plugins.doughnutCenter;
            if (!opts || !opts.display) return;
            const { ctx, chartArea: area } = chart;
            ctx.save();
            ctx.font = "bold 0.75rem Poppins, sans-serif"; // smaller
            ctx.fillStyle = "#0A2C59";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(opts.text1, (area.left + area.right) / 2, (area.top + area.bottom) / 2 - 10);
            ctx.font = "bold 1.1rem Poppins, sans-serif"; // smaller
            ctx.fillStyle = "#07B0F2";
            ctx.fillText(opts.text2, (area.left + area.right) / 2, (area.top + area.bottom) / 2 + 12);
            ctx.restore();
          }
        }]
      });

      // Legend
      const legend = document.querySelector(".civil-status-legend");
      if (legend) {
        legend.innerHTML = civilStatusCategories.map((label, i) =>
          `<span class="legend-item">
            <span class="legend-dot" style="background:${colors[i]}"></span>
            ${label}
          </span>`
        ).join("");
      }

      // Remove any Chart.js-generated HTML legend from previous renders (ul or div)
      document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());

      // Info summary (no total respondents here)
      const mostElem = document.getElementById("civilStatusMost");
      if (mostElem) mostElem.textContent = mostCommon;
      const percElem = document.getElementById("civilStatusPercentages");
      if (percElem) {
        // Build two columns
        const items = civilStatusCategories
          .map((label, i) =>
            counts[i] > 0
              ? `<span><strong>${label}:</strong> ${percentages[i]}%  </span>`// (${counts[i]}) //this shouldd be beside the percentage if needed   
              : ""
          )
          .filter(Boolean);

        // Split into two columns
        const mid = Math.ceil(items.length / 2);
        const col1 = items.slice(0, mid);
        const col2 = items.slice(mid);

        percElem.innerHTML = `
          <div style="display: flex; gap: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              ${col1.join("")}
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              ${col2.join("")}
            </div>
          </div>
        `;
      }
    });
}

// Minimal prediction chart for demo
function initPredictionChart() {
  const ctx = document.getElementById('predictionChart').getContext('2d');
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