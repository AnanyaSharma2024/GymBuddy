# GymBuddy Frontend

A clean, modern, and responsive frontend for GymBuddy — a gym-partner-matching application designed to help users find compatible workout partners and build a fitness community.

This project provides the user interface and navigation flow for the GymBuddy application. It is built using HTML, CSS, and JavaScript.

---

## 1. Technologies Used

- HTML5 – Website structure and page content
- CSS3 – Styling, layouts, and responsive design
- JavaScript – Frontend interactions and navigation
- Bootstrap – UI components and styling support
- VS Code – Development environment
- Live Server – Local development and preview

## 2. Project Setup

Follow these steps to run the frontend locally:

```bash
# Extract the frontend ZIP file
# Open the extracted GymBuddy-Frontend folder in VS Code
```

1. Open the `GymBuddy-Frontend` folder in VS Code.
2. Install the Live Server extension if it is not already installed.
3. Right-click on `index.html`.
4. Select **Open with Live Server**.
5. The GymBuddy landing page will open in your browser.

## 3. Application Flow

The frontend follows this navigation flow:

1. **Landing Page (`index.html`)**
   - Home
   - About
   - Features
   - Log In
   - Sign Up

2. **Login and Signup**
   - Provides demo login and signup forms.
   - Submitting either form redirects to the dashboard for preview purposes.

3. **Dashboard (`dashboard.html`)**

   After entering the dashboard, users can navigate to:

   - Profile
   - Find Buddies
   - Requests
   - Chat
   - Gyms
   - Workouts

## 4. Project Structure

```text
GymBuddy-Frontend/
│
├── index.html          # Landing page
├── login.html          # Login page
├── signup.html         # Signup page
├── dashboard.html      # User dashboard
├── profile.html        # Profile page
├── buddy.html          # Find workout partners
├── requests.html       # Buddy requests
├── chat.html           # Chat interface
├── gyms.html           # Gym listings
├── workouts.html       # Workout information
│
├── style.css           # Shared styling
├── script.js           # Frontend interactions
└── README.md           # Project documentation
```

## 5. Main Features

- Modern landing page with Home, About, and Features sections.
- Login and signup interface.
- Dashboard with navigation to different sections.
- User profile preview and editing form.
- Find workout buddies interface.
- Buddy request interface.
- Chat interface for messaging preview.
- Gym listings and workout information.
- Shared CSS and JavaScript files for consistent design.

## 6. Frontend Functionality

The application currently works as a frontend-only demo.

- Login and signup forms redirect users to the dashboard.
- Profile details can be entered in the preview form.
- Buddy requests and profile changes are not saved permanently.
- Chat messages are limited to the current browser page.
- Sample profiles, requests, gyms, and workouts are illustrative.
- No real authentication or server-side data processing is implemented.

## 7. Backend Integration Status

The frontend is currently developed independently and does not include or modify the existing GymBuddy backend.

The following features are not connected to the backend yet:

- User authentication
- Profile data storage
- Buddy request management
- Real-time chat
- Dynamic gym and workout data

Backend integration can be performed separately using the available API endpoints.

## 8. Current Limitations

- No real authentication or authorization.
- No database connectivity.
- No persistent data storage.
- No real-time messaging.
- Sample data is used for demonstration.
- Images are intentionally omitted in the current version.

## 9. Future Improvements

- Integrate the frontend with the existing Node.js and Express backend.
- Implement real login and signup functionality using Google OAuth.
- Connect user profiles and buddy recommendations with APIs.
- Enable real-time chat using Socket.IO.
- Display dynamic gym and workout information.
- Add profile images and other visual enhancements.
- Improve responsive design and overall user experience.

---

**GymBuddy – Find Your Fitness Community.**

Move together. Stay consistent.