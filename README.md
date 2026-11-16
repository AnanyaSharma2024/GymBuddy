GymBuddy --- Find Your Gym Buddy

GymBuddy is a full-stack gym-partner matching application that helps
people find compatible workout partners, connect with other members,
discover gyms, and build a consistent fitness community.

The project uses a lightweight HTML/CSS/JavaScript frontend and a
modular Node.js/Express backend. MongoDB stores application data, while
Redis and Socket.IO support backend caching and real-time communication.
Project status: Core application features and the
report-management flow have been implemented. The standalone Workouts
page/section has been removed from the frontend. Workout preferences
such as preferred workout time and experience remain part of user
profiles and buddy matching.

Table of Contents
- Features
- Technology Stack
- Application Architecture
- Project Structure
- Getting Started
- Environment Configuration
- Running the Application
- Main Application Flows
- Admin Dashboard
- API Overview
- Security Notes
- Troubleshooting
- Future Improvements
Features
Authentication and User Profiles
- User registration and login.
- Authenticated access to protected pages and APIs.
- User profile management.
- Fitness-related profile information, including workout experience,
  goals, and preferred workout time.
Gym Buddy Matching
- Browse potential gym partners.
- View buddy profiles and relevant fitness preferences.
- Find people with compatible workout preferences.
- Send, receive, accept, reject, and manage buddy requests.
- Keep workout timing and fitness preferences available for matching.
Chat and Communication
- Chat with connected gym buddies.
- Real-time communication support through Socket.IO.
- Conversation and message handling.
Gym Discovery
- Browse available gym listings.
- View gym information.
- Gym submissions can be reviewed by an administrator before approval.
Community Safety and Moderation
- Report another user from the Find Buddies page.
- Select a report reason and optionally provide details.
- Admins can view submitted reports.
- Admins can change report status to reviewing, resolved, or
  dismissed.
- Admins can suspend or reactivate user accounts through the backend
  moderation endpoints.
Admin Dashboard
- View pending gym submissions.
- Approve or reject submitted gyms.
- View the number of reports awaiting review.
- Review user reports and update their status.
Technology Stack
  Layer                               Technologies
  Frontend                            HTML5, CSS3, JavaScript, Bootstrap

  Backend                             Node.js, Express.js

  Database                            MongoDB, Mongoose

  Caching / backend services          Redis

  Real-time communication             Socket.IO

  Authentication / security           JWT-based authentication, protected
routes and role-based authorization
Optional integrations               Google OAuth, Cloudinary, Firebase
Cloud Messaging
The exact environment variables and enabled integrations depend on the
configuration in .env.example. Optional third-party services need
their own credentials.
Application Architecture
GymBuddy follows a modular-monolith backend structure. Features are
separated into domain modules while running as one Node.js application.

Typical request flow:
Browser
   |
   v
HTML / CSS / JavaScript frontend
   |
   v
Express routes
   |
   v
Middleware
(authentication, authorization, validation)
   |
   v
Controllers
   |
   v
Services
   |
   v
Mongoose models
   |
   v
MongoDB

Redis      -> caching / supporting backend operations
Socket.IO  -> real-time communication
Backend layering
- Routes: Define API endpoints and attach middleware.
- Middleware: Handle authentication, authorization, validation,
  and shared request processing.
- Controllers: Handle HTTP requests and responses.
- Services: Contain application and business logic.
- Models: Define MongoDB document schemas using Mongoose.
- Config: Centralize database and external-service configuration.
- Sockets: Handle real-time conversation events.
This separation keeps feature logic organized and makes the backend
easier to maintain.
Project Structure
The following is a high-level view of the project. Some files may differ
as the codebase evolves.
GymBuddy/
|
|-- frontend/
|   |-- index.html
|   |-- login.html
|   |-- signup.html
|   |-- dashboard.html
|   |-- profile.html
|   |-- buddy.html
|   |-- requests.html
|   |-- chat.html
|   |-- gyms.html
|   |-- admin.html
|   |-- style.css
|   |-- script.js
|   |-- buddy.js
|   |-- admin.js
|   |-- auth-guard.js
|   `-- ...
|
|-- src/
|   |-- config/          # Environment, database and service configuration
|   |-- middleware/      # Authentication, authorization and validation
|   |-- models/          # Mongoose models
|   |-- modules/         # Feature-based routes, controllers and services
|   |-- sockets/         # Socket.IO handlers
|   |-- utils/           # Shared utilities
|   `-- app.js            # Express application setup
|
|-- scripts/              # Project maintenance / utility scripts
|-- server.js             # Server entry point
|-- package.json
|-- .env.example
`-- README.md
Main backend domains
The backend is organized around application domains such as:
- Authentication and users
- Gyms
- Buddy recommendations and buddy requests
- Conversations and messages
- Notifications
- Reports and administration
Getting Started
Prerequisites
Install or arrange the following:
- Node.js (use a currently supported LTS release compatible with the
  project dependencies).
- npm.
- MongoDB (local installation or MongoDB Atlas).
- Redis (local installation or a hosted Redis service).
- Git.
Optional integrations such as Google OAuth, Cloudinary, or Firebase
require their own accounts and credentials.
1. Clone the repository
git clone <your-repository-url>
cd GymBuddy
Replace <your-repository-url> with the actual GitHub repository URL.
2. Install dependencies
npm install
3. Create your environment file
On Windows PowerShell:
Copy-Item .env.example .env
On macOS / Linux:
cp .env.example .env
Open .env and configure the values for your local environment. Do not
copy someone else's secrets.
4. Start MongoDB and Redis
Make sure your MongoDB and Redis services are running and that the
connection URLs in .env point to them.

For a local development setup, the database name used by this project
has been gym_buddy. Use the exact connection variable names and
defaults from the current .env.example.
5. Start the development server
npm run dev
The development server is configured to listen on port 5000 unless
overridden by the environment configuration.

Open the application in your browser:
http://localhost:5000
The Express application serves the frontend files from the frontend
directory, so a separate frontend development server is not required for
the standard local setup.
Environment Configuration
The repository should contain an .env.example file with placeholder
values. Use it as the source of truth for the exact variable names
required by the current codebase.

Configuration may include:
  Configuration                       Purpose
  PORT                              Backend server port

  MongoDB URI                         MongoDB connection

  Redis URL                           Redis connection

  Client / frontend URL               Allowed frontend origin for
cross-origin requests, where
applicable

  JWT secrets and expiry settings     Token signing and authentication
configuration

  Google OAuth credentials            Google sign-in, if enabled

  Cloudinary credentials              Profile image storage, if enabled

  Firebase service-account values     Push notifications, if enabled
Cookie settings                     Authentication cookie configuration
Important: - Never commit .env. - Never publish JWT secrets, OAuth
client secrets, Cloudinary API secrets, Firebase private keys, or
database credentials. - Keep .env.example limited to placeholder
values. - If an optional integration is not configured, verify the
application's fallback behavior before relying on that feature.
Running the Application
Development
npm run dev
Use the development script defined in package.json. The current local
workflow uses nodemon to restart the Node.js server when backend files
change.
Production
Before deploying: 1. Configure production environment variables. 2. Use
a production MongoDB and Redis service. 3. Configure allowed frontend
origins and secure cookie settings. 4. Use HTTPS. 5. Keep all
credentials in the hosting provider's secret/environment configuration.
6. Run the application's available checks and test the main user flows.

The exact production start command should match the scripts section in
package.json.
Main Application Flows
User flow
1. A visitor opens GymBuddy.
2. The visitor creates an account or logs in.
3. The user completes or updates their profile.
4. The user browses potential gym buddies.
5. The user sends a buddy request.
6. Once connected, users can communicate through chat.
7. Users can browse gym listings and find a suitable gym.
Reporting flow
1. A logged-in user opens Find Buddies.
2. The user selects Report User on another member's card.
3. The user selects a reason and optionally enters additional details.
4. The frontend sends the report to the backend.
5. The report is stored with an initial open status.
6. An administrator opens the Admin Dashboard and reviews the report.
7. The administrator updates the report status.
Available report reasons:
- harassment
- spam
- fake_profile
- inappropriate_behavior
- other
Available report statuses:
- open
- reviewing
- resolved
- dismissed
Admin Dashboard
The Admin Dashboard is intended for accounts whose database role is
admin.

Administrators can: - Review pending gym submissions. - Approve or
reject gym submissions. - View user reports. - Review the reporter,
reported user, reason, and optional details. - Update report status. -
Use the backend's user moderation endpoints to suspend or reactivate
accounts.
Local admin access
For local development, a developer can create a normal account and
assign that account the admin role directly in their own development
database.

For example, the relevant user document must have:
{
  "role": "admin"
}
The actual user document contains other fields; do not replace the
entire document with this example. Change only the role field. Log out
and log in again after changing the role if the application stores role
information in the authentication session or token.

Security: Do not expose a public endpoint that lets users promote
themselves to admin. Never give ordinary users access to administrative
routes.
API Overview
All API endpoints are served by the Express backend. The exact route
definitions in the current source code are authoritative.

Important report and administration endpoints implemented in the project
include:
  Method                  Endpoint                                Purpose
  POST                  /api/reports                          Submit a user report

  GET                   /api/admin/reports                    List reports for
administrators

  PATCH                 /api/admin/reports/:id                Update a report's
status and resolution
notes

  POST                  /api/admin/users/:userId/suspend      Suspend a user
POST                  /api/admin/users/:userId/reactivate   Reactivate a user
Other API domains cover authentication, user profiles, gyms, buddy
recommendations, buddy requests, conversations, messages, and
notifications.

All administrative endpoints must be protected by authentication and
admin-role authorization.
Security Notes
- Keep secrets and credentials out of source control.
- Use environment variables for sensitive configuration.
- Protect private APIs with authentication middleware.
- Protect administrative APIs with role-based authorization.
- Validate incoming request data on the backend.
- Do not trust frontend-only checks for permissions.
- Do not allow users to report themselves.
- Do not expose database credentials or private service-account keys.
- Use HTTPS and secure cookie settings in production.
- Review dependency audit warnings and update vulnerable packages
  carefully.
Troubleshooting
Server does not start
- Check that dependencies are installed with npm install.
- Check that the .env file exists and has valid values.
- Check that the configured port is not already in use.
- Read the first error in the terminal; later errors may be
  consequences of the first one.
MongoDB connection fails
- Confirm MongoDB is running.
- Verify the MongoDB URI in .env.
- For Atlas, check the database user and network access configuration.
Redis connection fails
- Confirm Redis is running and reachable.
- Verify the Redis URL in .env.
- Check whether a local Redis container or service is already using
  the configured port.
Admin page redirects or shows access denied
- Confirm that the signed-in account has role: "admin" in the
  development database.
- Log out and log back in after changing the role.
- Confirm that the admin API requests are authenticated.
Reports do not appear
- Confirm the report submission request succeeds.
- Confirm the signed-in admin account has the correct role.
- Check the browser console and backend terminal for API errors.
- Confirm the report is stored in the same MongoDB database used by
  the running backend.
Future Improvements
Possible improvements for future iterations include:
- Automated unit and integration test coverage for all critical flows.
- A documented Postman or equivalent API collection.
- Deployment configuration and a public demo environment.
- Improved pagination and filtering for large report and buddy lists.
- More detailed moderation audit history.
- Additional chat capabilities such as media attachments.
- Improved accessibility and responsive UI testing.
- Monitoring, structured operational metrics, and production logging.
These are future enhancements and should not be considered implemented
unless they are present and verified in the codebase.
Important Notes
- The frontend's standalone Workouts page/section has been removed
  because it is not part of the current user-facing application flow.
- Workout-related profile preferences remain because they support gym
  buddy matching.
- This project uses rule-based application logic; it does not require
  AI, RAG, or LangChain.
- The repository's source code and .env.example are the final
  authority for exact scripts, configuration names, and enabled
  integrations.