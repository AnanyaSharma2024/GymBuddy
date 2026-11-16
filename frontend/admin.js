
document.addEventListener("DOMContentLoaded", () => {
  const adminPanel = document.getElementById("admin-panel");
  const adminLink = document.getElementById("admin-nav-link");

  // Admin panel does not exist on other pages.
  if (!adminPanel) return;

  const gymList = document.getElementById("admin-gym-list");
  const gymCount = document.getElementById("pending-gym-count");
  const emptyState = document.getElementById("admin-gym-empty");
  const message = document.getElementById("admin-gym-message");
  const refreshButton = document.getElementById("refresh-gyms");

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

    if (!response.ok) {
      throw new Error(result.message || "Something went wrong.");
    }

    return result;
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#ef7777" : "";
  }

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

        showMessage(
          action === "approve"
            ? `${gym.name} approved successfully.`
            : `${gym.name} rejected.`
        );

        await loadPendingGyms();
      } catch (error) {
        showMessage(error.message, true);
        approveButton.disabled = false;
        rejectButton.disabled = false;
      }
    }

    approveButton.addEventListener("click", () => {
      updateGym("approve");
    });

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
    refreshButton.disabled = true;
    gymCount.textContent = "Loading...";

    try {
      const result = await apiRequest("/api/gyms/admin/pending");
      const gyms = result.data || [];

      gymList.replaceChildren();

      gyms.forEach((gym) => {
        gymList.appendChild(createGymCard(gym));
      });

      gymCount.textContent = gyms.length;
      emptyState.classList.toggle("hidden", gyms.length !== 0);
    } catch (error) {
      gymCount.textContent = "—";
      emptyState.classList.add("hidden");
      showMessage(error.message, true);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", loadPendingGyms);

  async function initializeAdmin() {
    try {
      const result = await apiRequest("/api/users/me");
      const user = result.data || result;

      if (user.role !== "admin") {
        adminPanel.hidden = true;
        return;
      }

      adminPanel.hidden = false;

      if (adminLink) {
        adminLink.hidden = false;
      }

      await loadPendingGyms();
    } catch (error) {
      adminPanel.hidden = true;
      console.error("Admin initialization error:", error);
    }
  }

  initializeAdmin();
});
