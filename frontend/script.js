// GymBuddy front-end interactions.
// Handles client-side search, demo actions/forms, chat display, and tabs.
// Explanatory comments are added without changing executable statements.
document.addEventListener("DOMContentLoaded", () => {
  // Locate optional search/filter controls and the cards they control.
  const search = document.querySelector("[data-search]");
  const filter = document.querySelector("[data-filter]");
  const cards = [...document.querySelectorAll("[data-card]")];
  const count = document.querySelector("[data-count]");
  const empty = document.querySelector("[data-empty]");
  // Show cards matching the current text query and selected fitness goal.
  function updateCards() {
    let shown = 0;
    cards.forEach((card) => {
      const query = (search?.value || "").toLowerCase().trim();
      const goal = (filter?.value || "all").toLowerCase();
      const text = (
        card.innerText +
        " " +
        (card.dataset.search || "")
      ).toLowerCase();
      const goalText = (card.dataset.goal || "").toLowerCase();
      const visible =
        text.includes(query) && (goal === "all" || goalText.includes(goal));
      card.classList.toggle("hidden", !visible);
      if (visible) shown++;
    });
    if (count)
      count.textContent = `${shown} ${shown === 1 ? "buddy" : "buddies"} found`;
    if (empty) empty.classList.toggle("hidden", shown !== 0);
  }
  search?.addEventListener("input", updateCards);
  filter?.addEventListener("change", updateCards);
  updateCards();

  // Demo buttons display a preview; they do not send data to a backend.
  document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.demoAction;
      const name = button.dataset.name || "this member";
      const message = document.querySelector("[data-message]");
      if (message)
        message.textContent =
          action === "request"
            ? `Demo mode: a buddy request to ${name} is not sent to a server yet.`
            : `Demo mode: ${action} is a front-end preview. Backend integration is not connected.`;
      else
        alert(
          action === "request"
            ? `Demo mode: a buddy request to ${name} is not sent to a server yet.`
            : `Demo mode: ${action} is a front-end preview. Backend integration is not connected.`,
        );
    });
  });

  // Demo forms show a notice instead of submitting to a server.
  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message =
        form.querySelector("[data-message]") ||
        document.querySelector("[data-message]");
      if (message)
        message.textContent =
          "Demo preview only: this form is not connected to the backend yet.";
    });
  });

  // Authentication currently uses demo navigation, not server-side verification.
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      // Demo navigation only. This does NOT authenticate against the backend.
      window.location.href = "dashboard.html";
    });
  });

  // Chat preview appends submitted text as a local message bubble.
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

  // Tabs toggle which panel is visible within their tab group.
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const group = tab.closest("[data-tabs]");
      group
        ?.querySelectorAll("[data-tab]")
        .forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      group?.parentElement
        .querySelectorAll("[data-tab-panel]")
        .forEach((panel) => {
          panel.classList.toggle("hidden", panel.dataset.tabPanel !== target);
        });
    });
  });
});
