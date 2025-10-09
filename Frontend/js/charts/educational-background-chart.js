Chart.defaults.plugins.legend.display = false;

export function renderEducationalBackgroundBar(year, cycle) {
  const categories = [
    "Elementary Undergraduate", "Elementary Graduate",
    "High School Undergraduate", "High School Graduate",
    "Vocational Graduate", "College Undergraduate",
    "College Graduate", "Masters Graduate",
    "Doctorate Level", "Doctorate Graduate"
  ];
  const colors = [
    "#07B0F2", "#FED600", "#0A2C59", "#ef4444", "#22c55e",
    "#6366f1", "#f59e42", "#f472b6", "#8b5cf6", "#fbbf24"
  ];

  const acronyms = [
    "EUG",  // Elementary Undergraduate
    "EG",   // Elementary Graduate
    "HSUG", // High School Undergraduate
    "HSG",  // High School Graduate
    "VG",   // Vocational Graduate
    "CUG",  // College Undergraduate
    "CG",   // College Graduate
    "MG",   // Masters Graduate
    "DL",   // Doctorate Level
    "DG"    // Doctorate Graduate
  ];

  const token = sessionStorage.getItem("token");
  if (!token) return;

  let url = "http://localhost:5000/api/kkprofiling";
  if (year && cycle) url += `?year=${year}&cycle=${cycle}`;

  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(profiles => {
      const counts = categories.map(
        cat => profiles.filter(p => p.educationalBackground === cat).length
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const maxIdx = counts.indexOf(Math.max(...counts));

      // Remove any Chart.js-generated HTML legend from previous renders
      document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());

      // Destroy any existing chart instance before re-rendering
      if (window.educationalBackgroundChart) window.educationalBackgroundChart.destroy();

      // Create the new bar chart
      const canvas = document.getElementById("educationalBackgroundBar");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      window.educationalBackgroundChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: categories, // still needed for tooltips
          datasets: [{
            label: "Count",
            data: counts,
            backgroundColor: colors,
            borderRadius: 8,
            maxBarThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }, // No default legend
            tooltip: {
              backgroundColor: "rgba(255,255,255,0.9)",
              titleColor: "#0A2C59",
              bodyColor: "#0A2C59",
              borderColor: "#e1e8ff",
              borderWidth: 1,
              padding: 10,
              boxPadding: 6,
              usePointStyle: true,
              callbacks: {
                label: function(context) {
                  return `${categories[context.dataIndex]}: ${counts[context.dataIndex]}`;
                }
              }
            }
          },
          scales: {
            x: {
              display: false, // <--- Hide x-axis labels (category names)
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#0A2C59", font: { weight: "bold", size: 11 } },
              grid: { borderDash: [4, 4] }
            }
          }
        }
      });

      // Update summary text
      const summaryElem = document.getElementById("educationalBackgroundSummary");
      if (summaryElem) {
        // Pair each category with its count
        const summaryPairs = categories.map((cat, i) => ({
          label: cat,
          value: counts[i]
        }));

        // Sort descending by value
        summaryPairs.sort((a, b) => b.value - a.value);

        // Find the most common (now at index 0 after sort)
        const mostCommon = summaryPairs[0]?.label || "—";

        // Build summary items
        const items = summaryPairs.map(pair =>
          `<div class="educational-background-summary-item">
            <span class="summary-label">${pair.label}:</span>
            <span class="summary-value">${pair.value}</span>
          </div>`
        ).join("");

        summaryElem.innerHTML = `
          <div class="educational-background-summary-row">
            <span class="summary-label">Total Respondents:</span>
            <span class="summary-value">${total}</span>
          </div>
          <div class="educational-background-summary-row">
            <span class="summary-label">Most Common:</span>
            <span class="summary-value">${mostCommon}</span>
          </div>
          ${items}
        `;
      }

      // Custom legend (your own design)
      const legendElem = document.querySelector(".educational-background-legend");
      if (legendElem) {
        // Build legend items
        const items = categories.map((label, i) => `
          <span class="legend-item">
            <span class="legend-dot" style="background:${colors[i]}"></span>
            ${label}
          </span>
        `);

        // Arrange as 3 columns (column-wise)
        const columns = 3;
        const rows = Math.ceil(items.length / columns);
        let legendHTML = '';
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const idx = col * rows + row;
            if (items[idx]) legendHTML += items[idx];
          }
        }
        legendElem.innerHTML = legendHTML;
      }
    })
    .catch(err => console.error("Error rendering educational background chart:", err));
}
