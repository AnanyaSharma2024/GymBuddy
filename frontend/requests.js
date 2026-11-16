
const receivedContainer = document.querySelector("#received-requests");
const sentContainer = document.querySelector("#sent-requests");
const connectedContainer = document.querySelector("#connected-buddies");

const receivedEmpty = document.querySelector("#received-empty");
const sentEmpty = document.querySelector("#sent-empty");
const connectedEmpty = document.querySelector("#connected-empty");

const message = document.querySelector("#request-message");

let activeTab = "received";

// Display messages on the page.
function showMessage(text) {
  message.textContent = text;
}

// Handle API authentication errors.
function handleUnauthorized(response) {
  if (response.status === 401) {
    window.location.replace("/login.html");
    return true;
  }

  return false;
}

// Create a profile avatar.
function createAvatar(user) {
  if (user?.profileImage) {
    const image = document.createElement("img");
    image.src = user.profileImage;
    image.alt = `${user.name || "User"}'s profile`;
    image.className = "avatar";
    image.style.objectFit = "cover";
    return image;
  }

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = (user?.name || "G").charAt(0).toUpperCase();

  return avatar;
}

// Create profile information.
function createUserDetails(user) {
  const details = document.createElement("div");
  details.className = "grow";

  const name = document.createElement("h3");
  name.textContent = user?.name || "GymBuddy Member";

  const info = document.createElement("p");
  info.className = "muted";

  const goal = user?.fitnessGoal || "Fitness goal not set";
  const experience = user?.experienceLevel || "Experience not set";
  const city = user?.city || "Location not shared";

  info.textContent =
    `${goal.replaceAll("_", " ")} · ${experience} · ${city}`;

  details.append(name, info);

  return details;
}

// Create a status label.
function createStatus(status) {
  const element = document.createElement("span");
  element.className = "tag";
  element.textContent = (status || "unknown").toUpperCase();

  return element;
}

// Create a request card.
function createRequestCard(request, direction) {
  const user =
    direction === "incoming"
      ? request.sender
      : request.recipient;

  const card = document.createElement("article");
  card.className = "card request-row";

  const details = createUserDetails(user);
  details.appendChild(createStatus(request.status));

  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (direction === "incoming" && request.status === "pending") {
    const accept = document.createElement("button");
    accept.className = "btn btn-primary btn-small";
    accept.type = "button";
    accept.textContent = "Accept";

    accept.addEventListener("click", () => {
      updateRequest(request._id, "accept");
    });

    const reject = document.createElement("button");
    reject.className = "btn btn-outline btn-small";
    reject.type = "button";
    reject.textContent = "Reject";

    reject.addEventListener("click", () => {
      updateRequest(request._id, "reject");
    });

    actions.append(accept, reject);
  }

  if (direction === "outgoing" && request.status === "pending") {
    const cancel = document.createElement("button");
    cancel.className = "btn btn-outline btn-small";
    cancel.type = "button";
    cancel.textContent = "Cancel Request";

    cancel.addEventListener("click", () => {
      updateRequest(request._id, "cancel");
    });

    actions.appendChild(cancel);
  }

  card.append(
    createAvatar(user),
    details,
    actions
  );

  return card;
}

// Create a connected buddy card.
function createConnectionCard(connection) {
  const user = connection.user;

  const card = document.createElement("article");
  card.className = "card request-row";

  const details = createUserDetails(user);

  const connectedLabel = document.createElement("span");
  connectedLabel.className = "tag";
  connectedLabel.textContent = "CONNECTED";

  details.appendChild(connectedLabel);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const unmatchButton = document.createElement("button");
  unmatchButton.className = "btn btn-outline btn-small";
  unmatchButton.type = "button";
  unmatchButton.textContent = "Unmatch";

  unmatchButton.addEventListener("click", () => {
    unmatchBuddy(user.id);
  });

  actions.appendChild(unmatchButton);

  card.append(
    createAvatar(user),
    details,
    actions
  );

  return card;
}

// Load incoming or outgoing requests.
async function loadRequests(direction) {
  const container =
    direction === "incoming"
      ? receivedContainer
      : sentContainer;

  const empty =
    direction === "incoming"
      ? receivedEmpty
      : sentEmpty;

  try {
    showMessage("Loading requests...");

    const response = await fetch(
      `/api/buddies/requests?direction=${direction}&limit=50`,
      {
        method: "GET",
        credentials: "same-origin",
      }
    );

    if (handleUnauthorized(response)) return;

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load requests.");
    }

    const requests = Array.isArray(result.data)
      ? result.data
      : [];

    container.replaceChildren();

    requests.forEach((request) => {
      container.appendChild(
        createRequestCard(request, direction)
      );
    });

    empty.classList.toggle("hidden", requests.length > 0);

    showMessage(
      direction === "incoming"
        ? "Received requests loaded."
        : "Sent requests loaded."
    );
  } catch (error) {
    console.error("Request loading error:", error);
    showMessage(error.message || "Unable to load requests.");
  }
}

// Load accepted buddy connections.
async function loadConnections() {
  try {
    showMessage("Loading connected buddies...");

    const response = await fetch(
      "/api/buddies/connections",
      {
        method: "GET",
        credentials: "same-origin",
      }
    );

    if (handleUnauthorized(response)) return;

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load connected buddies."
      );
    }

    const connections = Array.isArray(result.data)
      ? result.data
      : [];

    connectedContainer.replaceChildren();

    connections.forEach((connection) => {
      connectedContainer.appendChild(
        createConnectionCard(connection)
      );
    });

    connectedEmpty.classList.toggle(
      "hidden",
      connections.length > 0
    );

    showMessage("Connected buddies loaded.");
  } catch (error) {
    console.error("Connections loading error:", error);
    showMessage(
      error.message || "Unable to load connected buddies."
    );
  }
}

// Accept, reject or cancel a request.
async function updateRequest(requestId, action) {
  const endpoints = {
    accept: "accept",
    reject: "reject",
    cancel: "cancel",
  };

  try {
    showMessage("Updating request...");

    const response = await fetch(
      `/api/buddies/requests/${encodeURIComponent(requestId)}/${endpoints[action]}`,
      {
        method: "POST",
        credentials: "same-origin",
      }
    );

    if (handleUnauthorized(response)) return;

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update request.");
    }

    showMessage(result.message || "Request updated successfully.");

    await loadRequests(
      activeTab === "received" ? "incoming" : "outgoing"
    );
  } catch (error) {
    console.error("Request update error:", error);
    showMessage(error.message || "Unable to update request.");
  }
}

// Remove an existing buddy connection.
async function unmatchBuddy(userId) {
  const confirmed = window.confirm(
    "Are you sure you want to unmatch this buddy?"
  );

  if (!confirmed) return;

  try {
    showMessage("Removing buddy connection...");

    const response = await fetch(
      `/api/buddies/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      }
    );

    if (handleUnauthorized(response)) return;

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to unmatch buddy.");
    }

    showMessage(result.message || "Buddy unmatched successfully.");

    await loadConnections();
  } catch (error) {
    console.error("Unmatch error:", error);
    showMessage(error.message || "Unable to unmatch buddy.");
  }
}

// Handle tab switching.
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    activeTab = tab;

    document.querySelectorAll("[data-tab]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.classList.toggle(
        "hidden",
        panel.dataset.tabPanel !== tab
      );
    });

    if (tab === "received") {
      loadRequests("incoming");
    } else if (tab === "sent") {
      loadRequests("outgoing");
    } else if (tab === "connected") {
      loadConnections();
    }
  });
});

// Load the default tab.
loadRequests("incoming");
