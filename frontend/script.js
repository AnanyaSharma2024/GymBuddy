
// GymBuddy front-end interactions.
// Handles search, demo actions/forms, Google authentication, chat and tabs.

document.addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // SEARCH AND FILTER
  // ============================================================
  const search = document.querySelector("[data-search]");
  const filter = document.querySelector("[data-filter]");
  const cards = [...document.querySelectorAll("[data-card]")];
  const count = document.querySelector("[data-count]");
  const empty = document.querySelector("[data-empty]");

  function updateCards() {
    let shown = 0;

    cards.forEach((card) => {
      const query = (search?.value || "").toLowerCase().trim();
      const goal = (filter?.value || "all").toLowerCase();

      const text = (
        card.innerText + " " + (card.dataset.search || "")
      ).toLowerCase();

      const goalText = (card.dataset.goal || "").toLowerCase();

      const visible =
        text.includes(query) &&
        (goal === "all" || goalText.includes(goal));

      card.classList.toggle("hidden", !visible);

      if (visible) shown++;
    });

    if (count) {
      count.textContent = `${shown} ${shown === 1 ? "buddy" : "buddies"} found`;
    }

    if (empty) {
      empty.classList.toggle("hidden", shown !== 0);
    }
  }

  search?.addEventListener("input", updateCards);
  filter?.addEventListener("change", updateCards);

  updateCards();


  // ============================================================
  // DEMO ACTIONS
  // ============================================================

  document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.demoAction;
      const name = button.dataset.name || "this member";
      const message = document.querySelector("[data-message]");

      const notice =
        action === "request"
          ? `Demo mode: a buddy request to ${name} is not sent to a server yet.`
          : `Demo mode: ${action} is a front-end preview. Backend integration is not connected.`;

      if (message) {
        message.textContent = notice;
      } else {
        alert(notice);
      }
    });
  });


  // ============================================================
  // DEMO FORMS
  // ============================================================

  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const message =
        form.querySelector("[data-message]") ||
        document.querySelector("[data-message]");

      if (message) {
        message.textContent =
          "Demo preview only: this form is not connected to the backend yet.";
      }
    });
  });


  // ============================================================
  // GOOGLE OAUTH LOGIN / SIGNUP
  // ============================================================

  document.querySelectorAll("[data-google-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      const message = document.querySelector("[data-message]");

      try {
        button.disabled = true;

        if (message) {
          message.textContent = "Connecting to Google...";
        }

        // Generate PKCE code verifier
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));

        // Convert bytes into Base64 URL format
        const toBase64Url = (bytes) =>
          btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const codeVerifier = toBase64Url(randomBytes);

        // Generate SHA-256 code challenge
        const encodedVerifier = new TextEncoder().encode(codeVerifier);

        const digest = await crypto.subtle.digest(
          "SHA-256",
          encodedVerifier
        );

        const codeChallenge = toBase64Url(new Uint8Array(digest));

        // Save verifier for callback page
        sessionStorage.setItem("gymbuddy_code_verifier", codeVerifier);

        // Initialize Google OAuth through backend
        const response = await fetch("/api/auth/google/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ codeChallenge }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to start Google login."
          );
        }

        // Save OAuth state
        sessionStorage.setItem(
          "gymbuddy_oauth_state",
          result.data.state
        );

        // Redirect user to Google
        window.location.href = result.data.authUrl;

      } catch (error) {
        console.error("Google login error:", error);

        if (message) {
          message.textContent =
            error.message || "Google login failed.";
        }

        button.disabled = false;
      }
    });
  });


  // ============================================================
  // CHAT PREVIEW
  // ============================================================

  const chatForm = document.querySelector("[data-chat-form]");
  const chatInput = document.querySelector("[data-chat-input]");
  const messages = document.querySelector("[data-messages]");

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = chatInput?.value.trim();

    if (!value || !messages) return;

    const bubble = document.createElement("div");

    bubble.className = "bubble mine";
    bubble.textContent = value;

    messages.appendChild(bubble);

    chatInput.value = "";
    messages.scrollTop = messages.scrollHeight;
  });


  // ============================================================
  // TABS
  // ============================================================

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const group = tab.closest("[data-tabs]");

      group?.querySelectorAll("[data-tab]").forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      const target = tab.dataset.tab;

      group?.parentElement
        .querySelectorAll("[data-tab-panel]")
        .forEach((panel) => {
          panel.classList.toggle(
            "hidden",
            panel.dataset.tabPanel !== target
          );
        });
    });
  });


  // ============================================================
  // GOOGLE OAUTH CALLBACK
  // ============================================================

  const authStatus = document.querySelector("[data-auth-status]");

  if (authStatus) {
    const params = new URLSearchParams(window.location.search);

    const code = params.get("code");
    const state = params.get("state");
    const googleError = params.get("error");

    const showAuthError = (message) => {
      authStatus.textContent = message;
      authStatus.style.color = "#ff6b6b";
    };

    const completeGoogleLogin = async () => {
      try {
        // Handle Google authorization errors
        if (googleError) {
          throw new Error(
            params.get("error_description") || googleError
          );
        }

        // Retrieve saved OAuth information
        const savedState = sessionStorage.getItem(
          "gymbuddy_oauth_state"
        );

        const codeVerifier = sessionStorage.getItem(
          "gymbuddy_code_verifier"
        );

        // Validate OAuth state
        if (!code || !state || state !== savedState || !codeVerifier) {
          throw new Error(
            "Invalid authentication session. Please try again."
          );
        }

        authStatus.textContent = "Verifying your Google account...";

        // Send authorization code to backend
        const response = await fetch("/api/auth/google/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            code,
            state,
            codeVerifier,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Google authentication failed."
          );
        }

        // Clear temporary OAuth information
        sessionStorage.removeItem("gymbuddy_oauth_state");
        sessionStorage.removeItem("gymbuddy_code_verifier");

        authStatus.textContent = "Login successful! Redirecting...";

        // Open dashboard after successful authentication
        window.location.replace("/dashboard.html");

      } catch (error) {
        console.error("Google callback error:", error);

        showAuthError(
          error.message || "Authentication failed. Please try again."
        );

        sessionStorage.removeItem("gymbuddy_oauth_state");
        sessionStorage.removeItem("gymbuddy_code_verifier");
      }
    };

    completeGoogleLogin();
  }
  // ============================================================================
// DASHBOARD: LOAD LOGGED-IN USER
// ============================================================================

const userNameElement = document.querySelector("[data-user-name]");

if (userNameElement) {
  async function loadDashboardUser() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin",
      });

      // If the user is not logged in, redirect to login.
      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load your profile.");
      }

      const user = result.data;
      // Show Admin link only for admin accounts.
const adminLink = document.getElementById("admin-nav-link");

if (adminLink && user.role === "admin") {
  adminLink.hidden = false;
}

      // Display user's Google account details.
      userNameElement.textContent = `Hi, ${user.name}!`;

      document.querySelector("[data-user-email]").textContent =
        user.email || "";

      document.querySelector("[data-user-goal]").textContent =
        user.fitnessGoal
          ? `Fitness Goal: ${user.fitnessGoal}`
          : "Set your fitness goal in your profile.";

      // Display Google profile picture if available.
      const profileImage = document.querySelector("[data-user-image]");

      if (profileImage && user.profileImage) {
        profileImage.src = user.profileImage;
        profileImage.hidden = false;
      }
    } catch (error) {
      console.error("Dashboard error:", error);
      userNameElement.textContent = "Unable to load your profile.";
    }
  }

  loadDashboardUser();
}
// ============================================================================
// LOGOUT: END USER SESSION
// ============================================================================

const logoutButton = document.querySelector("[data-logout]");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      logoutButton.disabled = true;
      logoutButton.textContent = "Logging out...";

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Logout failed.");
      }

      window.location.replace("/login.html");
    } catch (error) {
      console.error("Logout error:", error);
      logoutButton.disabled = false;
      logoutButton.textContent = "Log Out";
      alert("Unable to log out. Please try again.");
    }
  });
}

// ============================================================================
// PROFILE: LOAD AND UPDATE USER PROFILE
// ============================================================================

const profileForm = document.querySelector("#profile-form");

if (profileForm) {
  const profileMessage = document.querySelector("[data-profile-message]");
  const saveButton = document.querySelector("#save-profile");
  // Profile image upload
  const imageInput = document.querySelector("#profile-image-input");
  const uploadImageButton = document.querySelector("#upload-profile-image");
  const imageMessage = document.querySelector("#profile-image-message");
  const profileImage = document.querySelector("[data-profile-image]");
  const profileAvatar = document.querySelector("[data-profile-avatar]");

  let selectedImage = null;

  imageInput.addEventListener("change", () => {
    selectedImage = imageInput.files[0] || null;

    if (!selectedImage) {
      uploadImageButton.disabled = true;
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selectedImage.type)) {
      imageMessage.textContent = "Only JPG, PNG or WEBP images are allowed.";
      selectedImage = null;
      imageInput.value = "";
      uploadImageButton.disabled = true;
      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      imageMessage.textContent = "Image size must be less than 5 MB.";
      selectedImage = null;
      imageInput.value = "";
      uploadImageButton.disabled = true;
      return;
    }

    profileImage.src = URL.createObjectURL(selectedImage);
    profileImage.hidden = false;
    profileAvatar.hidden = true;

    imageMessage.textContent = selectedImage.name;
    uploadImageButton.disabled = false;
  });

  uploadImageButton.addEventListener("click", async () => {
    if (!selectedImage) return;

    try {
      uploadImageButton.disabled = true;
      uploadImageButton.textContent = "Uploading...";
      imageMessage.textContent = "Uploading your photo...";

      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/users/me/profile-image", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Image upload failed.");
      }

      profileImage.src = result.data.profileImage;
      profileImage.hidden = false;
      profileAvatar.hidden = true;

      selectedImage = null;
      imageInput.value = "";

      imageMessage.textContent = "Profile photo uploaded successfully!";
      const choosePhotoLabel = document.querySelector(
  'label[for="profile-image-input"]'
);

if (choosePhotoLabel) {
  choosePhotoLabel.textContent = "Change Photo";
}
      URL.revokeObjectURL(profileImage.dataset.previewUrl || "");
    } catch (error) {
      console.error("Profile image upload error:", error);
      imageMessage.textContent = error.message;
    } finally {
      uploadImageButton.disabled = !selectedImage;
      uploadImageButton.textContent = "Upload Photo";
    }
  });
  // Load existing profile from backend
  async function loadUserProfile() {
    try {
      const response = await fetch("/api/users/me", {
        method: "GET",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load profile.");
      }

      const user = result.data.user || result.data;

      // Fill form with saved details
      document.querySelector("#name").value = user.name || "";
      document.querySelector("#age").value = user.age ?? "";
      document.querySelector("#gender").value = user.gender || "";
      document.querySelector("#city").value = user.city || "";
      document.querySelector("#goal").value = user.fitnessGoal || "";
      document.querySelector("#experience").value =
        user.experienceLevel || "";
      document.querySelector("#time").value =
        user.preferredWorkoutTime || "";
      document.querySelector("#bio").value = user.bio || "";

      // Update profile summary
      document.querySelector("[data-profile-name]").textContent =
        user.name || "GymBuddy Member";

      document.querySelector("[data-profile-email]").textContent =
        user.email || "";

      document.querySelector("[data-profile-avatar]").textContent =
        (user.name || "G").charAt(0).toUpperCase();

      const profileImage = document.querySelector("[data-profile-image]");
const profileAvatar = document.querySelector("[data-profile-avatar]");
const choosePhotoLabel = document.querySelector(
  'label[for="profile-image-input"]'
);

if (user.profileImage) {
  profileImage.onload = () => {
    profileImage.hidden = false;
    profileAvatar.hidden = true;
  };

  profileImage.onerror = () => {
    profileImage.hidden = true;
    profileAvatar.hidden = false;
  };

  profileImage.src = user.profileImage;

  if (choosePhotoLabel) {
    choosePhotoLabel.textContent = "Change Photo";
  }
} else {
  profileImage.hidden = true;
  profileAvatar.hidden = false;

  if (choosePhotoLabel) {
    choosePhotoLabel.textContent = "Choose Photo";
  }
}
    } catch (error) {
      console.error("Profile loading error:", error);
      profileMessage.textContent = error.message;
    }
  }

  // Save updated profile to backend
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      profileMessage.textContent = "";

      const payload = {
        name: document.querySelector("#name").value.trim(),
        bio: document.querySelector("#bio").value.trim(),
      };

      const age = document.querySelector("#age").value;
      if (age !== "") payload.age = Number(age);

      const optionalFields = [
        ["gender", "#gender"],
        ["city", "#city"],
        ["fitnessGoal", "#goal"],
        ["experienceLevel", "#experience"],
        ["preferredWorkoutTime", "#time"],
      ];

      optionalFields.forEach(([key, selector]) => {
        const value = document.querySelector(selector).value;
        if (value !== "") payload[key] = value;
      });

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save profile.");
      }

      const user = result.data.user || result.data;

      document.querySelector("[data-profile-name]").textContent =
        user.name || payload.name;

      document.querySelector("[data-profile-avatar]").textContent =
        (user.name || payload.name).charAt(0).toUpperCase();

      profileMessage.textContent = "Profile updated successfully!";
    } catch (error) {
      console.error("Profile update error:", error);
      profileMessage.textContent = error.message;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save Profile";
    }
  });

  loadUserProfile();
}

});
