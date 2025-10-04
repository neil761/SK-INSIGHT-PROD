document.addEventListener("DOMContentLoaded", () => {
  // Only check for token, not role
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // If no token, redirect to login
  if (!token) {
    window.location.href = "../html/admin/admin-log.html";
    return;
  }

  // Initialize variables after auth check
  const modal = document.getElementById("exportModal");
  const closeModal = document.getElementById("closeModal");
  const exportForm = document.getElementById("exportForm");
  const modalTitle = document.getElementById("modalTitle");
  const yearSelect = document.getElementById("year");
  const cycleSelect = document.getElementById("cycle");
  let exportType = null;
  let cyclesData = [];

  // Map export type to formcycle endpoint
  const cycleEndpoints = {
    kk: "http://localhost:5000/api/formcycle/kk",
    educational: "http://localhost:5000/api/formcycle/educ",
    lgbtq: "http://localhost:5000/api/formcycle/lgbtq"
  };

  // Show modal when export button clicked
  document.querySelectorAll(".export-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      exportType = btn.dataset.type;
      // Get the card's heading text instead of button text
      const cardTitle = btn.closest('.export-card').querySelector('h3').textContent;
      modalTitle.textContent = `Export ${cardTitle}`;
      yearSelect.innerHTML = `<option value="">Loading...</option>`;
      cycleSelect.innerHTML = `<option value="">Select cycle</option>`;
      modal.style.display = "flex";

      // Fetch available cycles for selected type
      try {
        const res = await fetch(cycleEndpoints[exportType], {
          headers: { Authorization: `Bearer ${token}` }
        });
        cyclesData = await res.json();
        // Extract unique years
        const years = [...new Set(cyclesData.map(c => c.year))].sort((a, b) => b - a);
        yearSelect.innerHTML = `<option value="">Select year</option>` +
          years.map(y => `<option value="${y}">${y}</option>`).join("");
        cycleSelect.innerHTML = `<option value="">Select cycle</option>`;
      } catch (err) {
        yearSelect.innerHTML = `<option value="">Error loading years</option>`;
      }
    });
  });

  // When year changes, update cycle options
  yearSelect.addEventListener("change", () => {
    const selectedYear = yearSelect.value;
    const cycles = cyclesData
      .filter(c => String(c.year) === selectedYear)
      .map(c => c.cycleNumber)
      .sort((a, b) => a - b);
    cycleSelect.innerHTML = `<option value="">Select cycle</option>` +
      cycles.map(cn => `<option value="${cn}">${cn}</option>`).join("");
  });

  // Close modal
  closeModal.onclick = () => modal.style.display = "none";
  window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

  // Handle export form submit
  exportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const year = yearSelect.value;
    const cycle = cycleSelect.value;

    let endpoint = "";
    if (exportType === "kk") {
      endpoint = `http://localhost:5000/api/kkprofiling/export?year=${year}&cycle=${cycle}`;
    } else if (exportType === "educational") {
      endpoint = `http://localhost:5000/api/educational-assistance/export?year=${year}&cycle=${cycle}`;
    } else if (exportType === "lgbtq") {
      endpoint = `http://localhost:5000/api/lgbtqprofiling/export/excel?year=${year}&cycle=${cycle}`;
    }

    // Download Excel file
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}_profiles_${year}_cycle${cycle}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      modal.style.display = "none";
    } catch (err) {
      alert("Export failed.");
    }
  });
});