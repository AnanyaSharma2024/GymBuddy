
document.addEventListener("DOMContentLoaded", () => {
  const gymList = document.getElementById("gym-list");
  const gymCount = document.getElementById("gym-count");
  const gymEmpty = document.getElementById("gym-empty");
  const listMessage = document.getElementById("gym-list-message");

  const searchInput = document.getElementById("gym-search");
  const cityInput = document.getElementById("gym-city-filter");

  const addGymForm = document.getElementById("add-gym-form");
  const formMessage = document.getElementById("gym-form-message");
  const submitButton = document.getElementById("add-gym-submit");
  const locationButton = document.getElementById("use-gym-location");

  let gyms = [];
  let selectedGymId = null;

  function getId(value) {
    if (!value) return null;
    return String(value._id || value.id || value);
  }

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

  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#ef7777" : "";
  }

  function createGymCard(gym) {
    const card = document.createElement("article");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = gym.name;

    const city = document.createElement("p");
    city.textContent = gym.city || "City not available";

    const address = document.createElement("p");
    address.className = "muted";
    address.textContent = gym.address || "Address not provided";

    const status = document.createElement("span");
    status.className = "tag";
    status.textContent = gym.verified ? "VERIFIED" : "UNVERIFIED";

    const detailsButton = document.createElement("button");
    detailsButton.className = "btn btn-outline";
    detailsButton.type = "button";
    detailsButton.textContent = "View Details";

    const selectButton = document.createElement("button");
    selectButton.className = "btn btn-primary";
    selectButton.type = "button";

    const isSelected = getId(gym._id) === selectedGymId;
    selectButton.textContent = isSelected ? "Selected Gym" : "Select This Gym";
    selectButton.disabled = isSelected;

    const details = document.createElement("div");
    details.hidden = true;

    detailsButton.addEventListener("click", async () => {
      if (!details.hidden) {
        details.hidden = true;
        detailsButton.textContent = "View Details";
        return;
      }

      details.hidden = false;
      details.textContent = "Loading gym details...";
      detailsButton.textContent = "Hide Details";

      try {
        const result = await apiRequest(`/api/gyms/${gym._id}`);
        const fullGym = result.data || result;

        details.textContent = [
          `Name: ${fullGym.name}`,
          `Address: ${fullGym.address || "Not provided"}`,
          `City: ${fullGym.city}`,
          `Status: ${fullGym.verified ? "Verified" : "Unverified"}`,
        ].join("\n");

        details.style.whiteSpace = "pre-line";
      } catch (error) {
        details.textContent = error.message;
      }
    });

    selectButton.addEventListener("click", async () => {
      selectButton.disabled = true;
      selectButton.textContent = "Saving...";

      try {
        await apiRequest("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({
            gym: getId(gym._id),
            city: gym.city,
          }),
        });

        selectedGymId = getId(gym._id);
        showMessage(listMessage, `Your gym is now ${gym.name}.`);
        renderGyms();
      } catch (error) {
        selectButton.disabled = false;
        selectButton.textContent = "Select This Gym";
        showMessage(listMessage, error.message, true);
      }
    });

    card.append(
      status,
      heading,
      city,
      address,
      detailsButton,
      selectButton,
      details
    );

    return card;
  }

  function renderGyms() {
    const query = searchInput.value.trim().toLowerCase();
    const cityQuery = cityInput.value.trim().toLowerCase();

    const filtered = gyms.filter((gym) => {
      const searchableText = [
        gym.name,
        gym.city,
        gym.address,
      ].join(" ").toLowerCase();

      return (
        searchableText.includes(query) &&
        (gym.city || "").toLowerCase().includes(cityQuery)
      );
    });

    gymList.replaceChildren();

    filtered.forEach((gym) => {
      gymList.appendChild(createGymCard(gym));
    });

    gymCount.textContent =
      `${filtered.length} ${filtered.length === 1 ? "gym" : "gyms"} found`;

    gymEmpty.classList.toggle("hidden", filtered.length !== 0);
  }

  async function loadGyms() {
    gymCount.textContent = "Loading gyms...";

    try {
      const [gymResult, userResult] = await Promise.all([
        apiRequest("/api/gyms?limit=50"),
        apiRequest("/api/users/me"),
      ]);

      gyms = gymResult.data || [];
      const user = userResult.data || userResult;
      selectedGymId = getId(user.gym);

      renderGyms();
    } catch (error) {
      gymCount.textContent = "Could not load gyms.";
      showMessage(listMessage, error.message, true);
    }
  }

  searchInput.addEventListener("input", renderGyms);
  cityInput.addEventListener("input", renderGyms);

  locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage(formMessage, "Geolocation is not supported by your browser.", true);
      return;
    }

    locationButton.disabled = true;
    locationButton.textContent = "Getting location...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById("gym-latitude").value =
          position.coords.latitude;

        document.getElementById("gym-longitude").value =
          position.coords.longitude;

        locationButton.disabled = false;
        locationButton.textContent = "Use My Current Location";

        showMessage(formMessage, "Coordinates filled successfully.");
      },
      () => {
        locationButton.disabled = false;
        locationButton.textContent = "Use My Current Location";

        showMessage(
          formMessage,
          "Location access failed. Please enter coordinates manually.",
          true
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  addGymForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = "Adding Gym...";

    try {
      const gymData = {
        name: document.getElementById("gym-name").value.trim(),
        address: document.getElementById("gym-address").value.trim(),
        city: document.getElementById("gym-city").value.trim(),
        location: {
          lat: Number(document.getElementById("gym-latitude").value),
          lng: Number(document.getElementById("gym-longitude").value),
        },
      };

      if (
        !Number.isFinite(gymData.location.lat) ||
        !Number.isFinite(gymData.location.lng)
      ) {
        throw new Error("Please enter valid coordinates.");
      }

      const result = await apiRequest("/api/gyms", {
        method: "POST",
        body: JSON.stringify(gymData),
      });

      const newGym = result.data;

      addGymForm.reset();
      showMessage(
        formMessage,
        `${newGym.name} added successfully. It is awaiting verification.`
      );

      await loadGyms();
    } catch (error) {
      showMessage(formMessage, error.message, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Add Gym";
    }
  });

  loadGyms();
});
