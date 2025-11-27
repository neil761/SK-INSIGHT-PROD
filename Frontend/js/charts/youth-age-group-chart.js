
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

export async function renderYouthAgeGroupBar(year, cycle) {
  const categories = ["Child Youth", "Core Youth", "Young Youth"];
  const colors = ["#07B0F2", "#FED600", "#0A2C59"];

  const token = sessionStorage.getItem("token");
  if (!token) return;

  try {
    let url = `${API_BASE}/api/kkprofiling`;
    if (year && cycle) url += `?year=${year}&cycle=${cycle}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`API fetch failed: ${res.status} ${res.statusText}`);

    let data = await res.json();

    // Handle API returning array or nested data
    let profiles = Array.isArray(data) ? data : (data?.data || []);
    if (!Array.isArray(profiles)) profiles = [];

    // Count documents per category with normalization
    const counts = categories.map(cat => 
      profiles.reduce((sum, p) => {
        const val = p?.youthAgeGroup;
        if (typeof val === "string" && val.trim().toLowerCase() === cat.toLowerCase()) {
          return sum + 1;
        }
        return sum;
      }, 0)
    );

    const totalCount = counts.reduce((a, b) => a + b, 0);

    // Sort descending by value
    const summaryPairs = categories.map((cat, i) => ({
      label: cat,
      value: counts[i],
      color: colors[i]
    })).sort((a, b) => b.value - a.value);

    const sortedLabels = summaryPairs.map(p => p.label);
    const sortedCounts = summaryPairs.map(p => p.value);
    const sortedColors = summaryPairs.map(p => p.color);

    // Remove previous chart and legend
    document.querySelectorAll('.chartjs-legend, ul.chartjs-legend, div.chartjs-legend').forEach(el => el.remove());
    if (window.youthAgeGroupChart) window.youthAgeGroupChart.destroy();

    const canvas = document.getElementById("youthAgeGroupBar");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Render chart
    window.youthAgeGroupChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedLabels,
        datasets: [{
          label: "Count",
          data: sortedCounts,
          backgroundColor: sortedColors,
          borderRadius: 8,
          maxBarThickness: 60
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: { display: false },
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
              label: context => `${sortedLabels[context.dataIndex]}: ${sortedCounts[context.dataIndex]}`
            }
          }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: {
            beginAtZero: true,
            max: totalCount > 0 ? totalCount : undefined,
            ticks: { color: "#0A2C59", font: { weight: "bold", size: 11 } },
            grid: { borderDash: [4, 4] }
          }
        }
      }
    });

    // Render summary
    const summaryElem = document.getElementById("youthAgeGroupSummary");
    if (summaryElem) {
      const mostCommon = summaryPairs[0]?.label || "—";
      const mostCommonColor = summaryPairs[0]?.color || "#ccc";

      summaryElem.innerHTML = `
        <div class="modern-summary-header">
          <span class="modern-summary-title">Summary</span>
        </div>
        <div class="modern-summary-row modern-summary-total">
          <span class="modern-summary-label">Total</span>
          <span class="modern-summary-value">${totalCount}</span>
        </div>
        <div class="modern-summary-row modern-summary-most">
          <span class="modern-summary-label">Most Common</span>
          <span class="modern-summary-value" style="color:${mostCommonColor};font-weight:700;">
            <span class="legend-dot" style="background:${mostCommonColor};margin-right:6px;"></span>
            ${mostCommon}
          </span>
        </div>
        <div class="modern-summary-breakdown">
          ${summaryPairs.map(pair => `
            <div class="modern-summary-row">
              <span class="modern-summary-label">
                <span class="legend-dot" style="background:${pair.color};margin-right:6px;"></span>
                ${pair.label}
              </span>
              <span class="modern-summary-value">${pair.value}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Remove any custom legend
    const legendElem = document.querySelector(".youth-age-group-legend");
    if (legendElem) legendElem.innerHTML = "";

  } catch (err) {
    console.error("Error rendering youth age group chart:", err);
  }
}
