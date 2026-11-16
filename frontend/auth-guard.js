(() => {
  const page = window.location.pathname.split("/").pop().toLowerCase();

  const protectedPages = [
    "dashboard.html",
    "buddy.html",
    "chat.html",
    "gyms.html",
    "profile.html",
    "requests.html",
    "workouts.html",
    "admin.html"
  ];

  if (!protectedPages.includes(page)) return;

  document.documentElement.classList.add("auth-pending");

  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin"
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        window.location.replace("/login.html");
        return;
      }

      if (page === "admin.html" && result.data.role !== "admin") {
        window.location.replace("/dashboard.html");
        return;
      }

      document.documentElement.classList.remove("auth-pending");
    } catch (error) {
      window.location.replace("/login.html");
    }
  }

  checkAuthentication();
})();