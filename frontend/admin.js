
document.addEventListener("DOMContentLoaded", () => {
  // Gym elements
  const gymList = document.getElementById("admin-gym-list");
  const gymCount = document.getElementById("pending-gym-count");
  const gymEmpty = document.getElementById("admin-gym-empty");
  const gymMessage = document.getElementById("admin-gym-message");
  const refreshGymsButton = document.getElementById("refresh-gyms");

  // Report elements
  const reportList = document.getElementById("admin-report-list");
  const reportCount = document.getElementById("pending-report-count");
  const reportEmpty = document.getElementById("admin-report-empty");
  const reportMessage = document.getElementById("admin-report-message");
  const refreshReportsButton = document.getElementById("refresh-reports");

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Something went wrong.");
    }

    return result;
  }

  function showGymMessage(text, isError = false) {
    gymMessage.textContent = text;
    gymMessage.style.color = isError ? "#ef7777" : "";
  }

  function showReportMessage(text, isError = false) {
    reportMessage.textContent = text;
    reportMessage.style.color = isError ? "#ef7777" : "";
  }

  // ---------------- GYM MANAGEMENT ----------------

  function createGymCard(gym) {
    const card = document.createElement("article");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = gym.name;

    const city = document.createElement("p");
    city.textContent = `City: ${gym.city || "Not provided"}`;

    const address = document.createElement("p");
    address.className = "muted";
    address.textContent = `Address: ${gym.address || "Not provided"}`;

    const status = document.createElement("span");
    status.className = "tag";
    status.textContent = "PENDING VERIFICATION";

    const approveButton = document.createElement("button");
    approveButton.className = "btn btn-primary";
    approveButton.type = "button";
    approveButton.textContent = "Approve Gym";

    const rejectButton = document.createElement("button");
    rejectButton.className = "btn btn-outline";
    rejectButton.type = "button";
    rejectButton.textContent = "Reject Gym";

    async function updateGym(action) {
      approveButton.disabled = true;
      rejectButton.disabled = true;

      try {
        await apiRequest(`/api/gyms/admin/${gym._id}/${action}`, {
          method: "PATCH",
        });

        showGymMessage(
          action === "approve"
            ? `${gym.name} approved successfully.`
            : `${gym.name} rejected.`
        );

        await loadPendingGyms();
      } catch (error) {
        showGymMessage(error.message, true);
        approveButton.disabled = false;
        rejectButton.disabled = false;
      }
    }

    approveButton.addEventListener("click", () => updateGym("approve"));

    rejectButton.addEventListener("click", () => {
      if (confirm(`Are you sure you want to reject ${gym.name}?`)) {
        updateGym("reject");
      }
    });

    card.append(
      status,
      heading,
      city,
      address,
      approveButton,
      rejectButton
    );

    return card;
  }

  async function loadPendingGyms() {
    refreshGymsButton.disabled = true;
    gymCount.textContent = "Loading...";

    try {
      const result = await apiRequest("/api/gyms/admin/pending");
      const gyms = result.data || [];

      gymList.replaceChildren();

      gyms.forEach((gym) => {
        gymList.appendChild(createGymCard(gym));
      });

      gymCount.textContent = gyms.length;
      gymEmpty.classList.toggle("hidden", gyms.length !== 0);
    } catch (error) {
      gymCount.textContent = "—";
      gymEmpty.classList.add("hidden");
      showGymMessage(error.message, true);
    } finally {
      refreshGymsButton.disabled = false;
    }
  }

  // ---------------- REPORT MANAGEMENT ----------------

  function createReportCard(report) {
    const card = document.createElement("article");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = `Report: ${report.reportedUser?.name || "Unknown User"}`;

    const reporter = document.createElement("p");
    reporter.textContent =
      `Reported by: ${report.reporter?.name || "Unknown User"}`;

    const reason = document.createElement("p");
    reason.textContent =
      `Reason: ${report.reason.replaceAll("_", " ")}`;

    const details = document.createElement("p");
    details.className = "muted";
    details.textContent =
      `Details: ${report.details || "No additional details provided."}`;

    const date = document.createElement("p");
    date.className = "muted";
    date.textContent =
      `Submitted: ${new Date(report.createdAt).toLocaleString()}`;

    const currentStatus = document.createElement("p");
    currentStatus.textContent = `Current status: ${report.status}`;

    const statusSelect = document.createElement("select");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select new status";
    placeholder.selected = true;
    statusSelect.appendChild(placeholder);

    ["reviewing", "resolved", "dismissed"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent =
        status.charAt(0).toUpperCase() + status.slice(1);
      statusSelect.appendChild(option);
    });

    const notesLabel = document.createElement("label");
    notesLabel.textContent = "Resolution notes (optional)";

    const notes = document.createElement("textarea");
    notes.maxLength = 1000;
    notes.placeholder = "Add notes about your decision...";

    const updateButton = document.createElement("button");
    updateButton.className = "btn btn-primary";
    updateButton.type = "button";
    updateButton.textContent = "Update Report";
    updateButton.disabled = true;

    statusSelect.addEventListener("change", () => {
      updateButton.disabled = !statusSelect.value;
    });

    updateButton.addEventListener("click", async () => {
      if (!statusSelect.value) return;

      updateButton.disabled = true;
      updateButton.textContent = "Updating...";

      try {
        await apiRequest(`/api/admin/reports/${report._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: statusSelect.value,
            resolutionNotes: notes.value.trim(),
          }),
        });

        showReportMessage("Report status updated successfully.");
        await loadReports();
      } catch (error) {
        showReportMessage(error.message, true);
        updateButton.disabled = false;
        updateButton.textContent = "Update Report";
      }
    });

    card.append(
      heading,
      reporter,
      reason,
      details,
      date,
      currentStatus,
      notesLabel,
      notes,
      statusSelect,
      updateButton
    );

    return card;
  }

  async function loadReports() {
    refreshReportsButton.disabled = true;
    reportCount.textContent = "Loading...";

    try {
      const result = await apiRequest("/api/admin/reports");
      const reports = result.data || [];

      reportList.replaceChildren();

      reports.forEach((report) => {
        reportList.appendChild(createReportCard(report));
      });

      const pending = reports.filter(
        (report) =>
          report.status === "open" || report.status === "reviewing"
      ).length;

      reportCount.textContent = pending;
      reportEmpty.classList.toggle("hidden", reports.length !== 0);
    } catch (error) {
      reportCount.textContent = "—";
      reportEmpty.classList.add("hidden");
      showReportMessage(error.message, true);
    } finally {
      refreshReportsButton.disabled = false;
    }
  }

  // ---------------- ADMIN AUTHENTICATION ----------------

  async function initializeAdmin() {
    try {
      const result = await apiRequest("/api/auth/me");
      const user = result.data || result;

      if (user.role !== "admin") {
        window.location.replace("dashboard.html");
        return;
      }

      await Promise.all([
        loadPendingGyms(),
        loadReports(),
      ]);
    } catch (error) {
      console.error("Admin initialization error:", error);
      window.location.replace("login.html");
    }
  }

  refreshGymsButton.addEventListener("click", loadPendingGyms);
  refreshReportsButton.addEventListener("click", loadReports);

  initializeAdmin();
});
