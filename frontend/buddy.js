
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
const reportFormSection = document.querySelector("#report-form-section");
const reportUserForm = document.querySelector("#report-user-form");
const reportUserName = document.querySelector("#report-user-name");
const reportReason = document.querySelector("#report-reason");
const reportDetails = document.querySelector("#report-details");
const reportMessage = document.querySelector("#report-message");
const cancelReportButton = document.querySelector("#cancel-report");

let selectedReportedUser = null;
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
  const reportButton = document.createElement("button");
reportButton.className = "btn btn-outline";
reportButton.type = "button";
reportButton.textContent = "Report User";

reportButton.addEventListener("click", () => {
  selectedReportedUser = user.id;
  reportUserName.textContent = `Reporting: ${user.name || "GymBuddy Member"}`;
  reportMessage.textContent = "";
  reportUserForm.reset();
  reportFormSection.classList.remove("hidden");
  reportFormSection.scrollIntoView({ behavior: "smooth", block: "center" });
});

actions.appendChild(reportButton);

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
// ============================================================================
// REPORT USER
// ============================================================================

const submitReportButton = document.querySelector("#submit-report");

cancelReportButton.addEventListener("click", () => {
  reportUserForm.reset();
  reportMessage.textContent = "";
  selectedReportedUser = null;
  reportFormSection.classList.add("hidden");
});

reportUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedReportedUser) {
    reportMessage.textContent = "Please select a user to report.";
    return;
  }

  try {
    submitReportButton.disabled = true;
    submitReportButton.textContent = "Submitting...";
    reportMessage.textContent = "";

    const response = await fetch("/api/reports", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportedUser: selectedReportedUser,
        reason: reportReason.value,
        details: reportDetails.value.trim(),
      }),
    });

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to submit report.");
    }

    reportMessage.textContent =
      "Report submitted successfully. Our team will review it.";

    reportUserForm.reset();
    selectedReportedUser = null;
  } catch (error) {
    console.error("Report submission error:", error);
    reportMessage.textContent =
      error.message || "Unable to submit report. Please try again.";
  } finally {
    submitReportButton.disabled = false;
    submitReportButton.textContent = "Submit Report";
  }
});
