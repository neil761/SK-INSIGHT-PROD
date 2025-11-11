let lastPredictedCycle = null;
let lastPredictedYear = null;
let lastPredictionResult = null;
export async function renderPredictionChart(year, cycle) {
  const token = sessionStorage.getItem("token");

  // Fetch all predictions from the new GET API
  let predictionsArr = [];
  try {
    const res = await fetch("http://localhost:5000/api/cycle-predict", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      predictionsArr = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch predictions:", err);
    return;
  }

  // Find the prediction to display
  let predictionObj;
  if (year && cycle) {
    // Find the latest prediction for the selected year/cycle
    predictionObj = predictionsArr
      .filter(p => p.year === Number(year) && p.cycleNumber === Number(cycle))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  } else {
    // No filter: show the latest prediction overall
    predictionObj = predictionsArr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  // If no prediction found, show empty chart
  if (!predictionObj) {
    renderPredictionChartWithData({ predicted: {}, suggestions: [] }, year, cycle, token);
    return;
  }

  // Use the predictions and suggestions from the selected predictionObj
  const predicted = predictionObj.predictions || {};
  const suggestions = predictionObj.suggestions || [];

  renderPredictionChartWithData({ predicted, suggestions }, predictionObj.year, predictionObj.cycleNumber, token);
}

function renderPredictionChartWithData({ predicted, suggestions }, year, cycle, token) {
  let chartLabels = [
    "In School Youth",
    "Out of School Youth",
    "Working Youth",
    "Youth with Specific Needs"
  ];

  const predictionKeyMap = {
    "In School Youth": "In School Youth",
    "Out of School Youth": "Out of School Youth",
    "Working Youth": "Working Youth",
    "Youth with Specific Needs": "YSN"
  };

  // Fetch actual data from backend
  fetchActualData(year, cycle, token, chartLabels).then(actual => {
    // Prepare predicted and actual data arrays
    let predictedData = chartLabels.map(label =>
      predicted[predictionKeyMap[label]] || 0
    );
    let actualData = chartLabels.map(label => actual[label] || 0);

    // --- Sort by predicted value descending ---
    const sorted = chartLabels
      .map((label, idx) => ({
        label,
        predicted: predictedData[idx],
        actual: actualData[idx]
      }))
      .sort((a, b) => b.predicted - a.predicted);

    chartLabels = sorted.map(item => item.label);
    predictedData = sorted.map(item => item.predicted);
    actualData = sorted.map(item => item.actual);

    // compute threshold = highest actual value (reference)
    const maxActual = actualData.length ? Math.max(...actualData) : 0;

    // Chart.js grouped vertical bar chart
    const canvas = document.getElementById("predictionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (window.predictionChart && typeof window.predictionChart.destroy === "function") {
      window.predictionChart.destroy();
    }

    // Plugin to draw threshold line + label
    const thresholdPlugin = {
      id: 'thresholdPlugin',
      afterDatasetsDraw(chart, args, options) {
        const value = options?.value;
        if (value === undefined || value === null) return;
        const { ctx, chartArea: { left, right }, scales: { y } } = chart;
        const yPixel = y.getPixelForValue(value);

        ctx.save();
        // dashed line
        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = options.color || 'rgba(10,44,89,0.18)';
        ctx.moveTo(left, yPixel);
        ctx.lineTo(right, yPixel);
        ctx.stroke();

        // label box
        const label = options.label || `Dominant actual: ${value}`;
        ctx.font = '600 12px Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
        const textWidth = ctx.measureText(label).width;
        const padding = 8;
        const rectW = textWidth + padding * 2;
        const rectH = 22;
        const rectX = right - rectW - 8;
        let rectY = yPixel - rectH - 6;
        // clamp rect inside chart area
        const topLimit = 6;
        if (rectY < topLimit) rectY = topLimit;

        // white backdrop for readability
        ctx.fillStyle = options.background || 'rgba(255,255,255,0.95)';
        roundRect(ctx, rectX, rectY, rectW, rectH, 6, true, true);
        // label text
        ctx.fillStyle = options.textColor || '#071A40';
        ctx.fillText(label, rectX + padding, rectY + rectH - 7);

        ctx.restore();
      }
    };

    // helper for rounded rect
    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
      if (typeof r === 'undefined') r = 5;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    }

    window.predictionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Actual",
            data: actualData,
            backgroundColor: "#07B0F2",
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: "Predicted",
            data: predictedData,
            backgroundColor: "#FED600",
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          datalabels: { display: false },
          // pass threshold options here
          thresholdPlugin: {
            value: maxActual,
            label: `Dominant actual: ${maxActual}`,
            color: 'rgba(7,176,242,0.9)',
            background: 'rgba(255,255,255,0.98)',
            textColor: '#071A40'
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#e1e8ff", drawBorder: true },
            ticks: { display: true }
          }
        }
      },
      plugins: [thresholdPlugin]
    });

    // --- External info rendering ---

    // Numbers on the side
    const sideElem = document.querySelector(".prediction-side");
    if (sideElem) {
      sideElem.innerHTML = chartLabels.map((label, idx) => {
        // mark rows that match the threshold (dominant) or below
        const isDominant = actualData[idx] === maxActual && maxActual > 0;
        const rowClass = isDominant ? 'dominant' : 'below-threshold';
        return `
        <div class="prediction-value-row ${rowClass}">
          <span class="prediction-label">${label}</span>
          <span class="prediction-value actual">
            <span class="legend-dot actual"></span> ${actualData[idx]}
          </span>
          <span class="prediction-value predicted">
            <span class="legend-dot predicted"></span> ${predictedData[idx]}
          </span>
        </div>
      `;
      }).join("");
    }

    // Labels below the chart
    const chartArea = document.querySelector(".prediction-chart-area");
    if (chartArea) {
      let labelRow = chartArea.querySelector(".prediction-label-row");
      if (!labelRow) {
        labelRow = document.createElement("div");
        labelRow.className = "prediction-label-row";
        chartArea.appendChild(labelRow);
      }
      labelRow.innerHTML = chartLabels.map(label => `
        <span class="prediction-label-bottom">${label}</span>
      `).join("");
    }

    // Legend at the bottom (add threshold indicator)
    const legendElem = document.querySelector(".prediction-legend");
    if (legendElem) {
      legendElem.innerHTML = `
        <div class="legend-item">
          <span class="legend-dot actual"></span> Actual
        </div>
        <div class="legend-item">
          <span class="legend-dot predicted"></span> Predicted
        </div>
        <div class="legend-item">
          <span class="legend-threshold" style="display:inline-block;width:14px;height:2px;background:rgba(7,176,242,0.9);margin-right:8px;border-radius:2px;"></span> Dominant actual (${maxActual})
        </div>
      `;
    }

    // After Chart.js rendering
    const infoGrid = document.querySelector('.prediction-info-grid');
    if (infoGrid) {
      // Arrange info in two columns, two rows
      let html = '';
      for (let i = 0; i < chartLabels.length; i++) {
        const isDominant = actualData[i] === maxActual && maxActual > 0;
        const leftBorder = isDominant ? 'style="border-left-color: rgba(7,176,242,0.65);"' : '';
        html += `
          <div class="prediction-info-item" ${leftBorder}>
            <span>${chartLabels[i]}</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="legend-dot actual"></span><span class="actual">${actualData[i]}</span>
              <span class="legend-dot predicted"></span><span class="predicted">${predictedData[i]}</span>
            </div>
          </div>
        `;
      }
      infoGrid.innerHTML = html;
    }

    // Render cycle/year info
    const cycleInfoElem = document.querySelector(".prediction-cycle-info");
    if (cycleInfoElem) {
      cycleInfoElem.innerHTML = `
        <div class="cycle-info-box">
          <span class="cycle-label"></span>
          <span class="cycle-value">Year <b>${year}</b>, Cycle <b>${cycle}</b></span>
        </div>
      `;
    }
  });
}

async function fetchActualData(year, cycle, token, chartLabels) {
  let actual = {};
  try {
    let url = "http://localhost:5000/api/kkprofiling";
    if (year && cycle) url += `?year=${year}&cycle=${cycle}`;
    const resActual = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (resActual.ok) {
      const profiles = await resActual.json();
      actual = chartLabels.reduce((acc, label) => {
        acc[label] = profiles.filter(p => p.youthClassification === label).length;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error("Actual fetch error:", err);
  }
  return actual;
}
