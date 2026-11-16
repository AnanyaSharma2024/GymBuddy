
// ============================================================================
// GYMBUDDY - FIND BUDDIES
// Loads real buddy recommendations and sends buddy requests.
// ============================================================================

const buddyGrid = document.querySelector("#buddy-grid");
const buddySearch = document.querySelector("#buddy-search");
const buddyFilter = document.querySelector("#buddy-filter");
const buddyCount = document.querySelector("#buddy-count");
const buddyEmpty = document.querySelector("#buddy-empty");
const buddyMessage = document.querySelector("#buddy-message");

let buddies = [];

const goalLabels = {
  muscle_gain: "Muscle Gain",
  weight_loss: "Weight Loss",
  general_fitness: "General Fitness",
  strength: "Strength Training",
  endurance: "Endurance",
  flexibility: "Flexibility",
};

const timeLabels = {
  early_morning: "Early Morning",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  flexible: "Flexible",
};

function showMessage(message) {
  buddyMessage.textContent = message;
}

function createBuddyCard(user) {
  const card = document.createElement("article");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "buddy-top";

  if (user.profileImage) {
    const image = document.createElement("img");
    image.src = user.profileImage;
    image.alt = `${user.name}'s profile picture`;
    image.className = "avatar";
    image.style.objectFit = "cover";
    top.appendChild(image);
  } else {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = (user.name || "G").charAt(0).toUpperCase();
    top.appendChild(avatar);
  }

  const identity = document.createElement("div");

  const name = document.createElement("h3");
  name.textContent = user.name || "GymBuddy Member";

  const location = document.createElement("p");
  location.className = "muted";
  location.textContent = user.city || "Location not shared";

  identity.append(name, location);
  top.appendChild(identity);

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = "FITNESS ENTHUSIAST";

  const tags = document.createElement("div");
  tags.className = "tags";

  const details = [
    goalLabels[user.fitnessGoal] || "Fitness Goal Not Set",
    user.experienceLevel
      ? user.experienceLevel.charAt(0).toUpperCase() + user.experienceLevel.slice(1)
      : null,
    timeLabels[user.preferredWorkoutTime] || null,
  ].filter(Boolean);

  details.forEach((detail) => {
    const span = document.createElement("span");
    span.textContent = detail;
    tags.appendChild(span);
  });

  const bio = document.createElement("p");
  bio.textContent = user.bio || "Looking for a fitness partner.";

  const compatibility = document.createElement("p");
  compatibility.className = "muted";
  compatibility.textContent =
    typeof user.compatibilityScore === "number"
      ? `${user.compatibilityScore}% compatibility`
      : "";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const requestButton = document.createElement("button");
  requestButton.className = "btn btn-primary";
  requestButton.type = "button";
  requestButton.textContent = "Send Request";

  requestButton.addEventListener("click", () => {
    sendBuddyRequest(user.id, requestButton);
  });

  actions.appendChild(requestButton);

  card.append(top, tag, tags, bio, compatibility, actions);

  return card;
}

function renderBuddies() {
  const searchTerm = buddySearch.value.trim().toLowerCase();
  const selectedGoal = buddyFilter.value;

  const filtered = buddies.filter((user) => {
    const searchableText = [
      user.name,
      user.city,
      user.gym,
      user.fitnessGoal,
      user.experienceLevel,
      user.preferredWorkoutTime,
      user.bio,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    const matchesGoal =
      selectedGoal === "all" || user.fitnessGoal === selectedGoal;

    return matchesSearch && matchesGoal;
  });

  buddyGrid.replaceChildren();

  filtered.forEach((user) => {
    buddyGrid.appendChild(createBuddyCard(user));
  });

  buddyCount.textContent = `${filtered.length} buddies`;

  buddyEmpty.classList.toggle("hidden", filtered.length !== 0);
}

async function loadBuddies() {
  try {
    showMessage("Loading recommended buddies...");

    const response = await fetch("/api/buddies/recommendations?limit=50", {
      method: "GET",
      credentials: "same-origin",
    });

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load buddies.");
    }

    buddies = Array.isArray(result.data) ? result.data : [];

    renderBuddies();

    if (buddies.length === 0) {
      showMessage(
        "No recommendations available yet. Complete your profile and add your city or gym to improve matching."
      );
    } else {
      showMessage("Recommended buddies loaded successfully.");
    }
  } catch (error) {
    console.error("Buddy loading error:", error);
    buddyCount.textContent = "Unavailable";
    showMessage(error.message || "Unable to load buddies. Please try again.");
  }
}

async function sendBuddyRequest(userId, button) {
  try {
    button.disabled = true;
    button.textContent = "Sending...";

    const response = await fetch(`/api/buddies/requests/${encodeURIComponent(userId)}`, {
      method: "POST",
      credentials: "same-origin",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to send buddy request.");
    }

    button.textContent = "Request Sent";
    showMessage("Buddy request sent successfully!");
  } catch (error) {
    console.error("Buddy request error:", error);
    button.disabled = false;
    button.textContent = "Send Request";
    showMessage(error.message || "Unable to send request. Please try again.");
  }
}

buddySearch.addEventListener("input", renderBuddies);
buddyFilter.addEventListener("change", renderBuddies);

loadBuddies();
