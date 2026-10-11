# Find Me a Gym Buddy — Backend

A production-style, modular-monolith backend for a gym-partner-matching app. Built with
Node.js, Express, MongoDB, Redis, Socket.IO, Google OAuth 2.0 + PKCE, Cloudinary, and
Firebase Cloud Messaging. No AI/RAG/LangChain — pure backend engineering.

This README is the setup guide. The full architectural explanation (OAuth flow, token
storage, Redis usage, scoring algorithm, threat model, etc.) is in the chat response that
accompanies this project — read that alongside this file.

---

## 1. Requirements

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Redis 6+ (local or hosted)
- A Google Cloud OAuth 2.0 Client (Web application type)
- (Optional for full feature set) Cloudinary account, Firebase project with a service account

## 2. Local setup (without Docker)

```bash
git clone <your-repo-url>
cd gym-buddy-backend
npm install
cp .env.example .env
# edit .env with your real values (see section 4 below)
npm run dev
```

Server starts on `http://localhost:5000`. Health check: `GET /health`.

## 3. Local setup (with Docker)

```bash
cp .env.example .env
# edit .env - for Docker, leave MONGO_URI/REDIS_URL as-is; docker-compose.yml
# overrides them to point at the `mongo` and `redis` service names.
docker compose up --build
```

This starts three containers: `backend`, `mongo`, `redis` on a shared Docker network.
MongoDB and Redis are not exposed to your host by default — only the backend's port
5000 is published.

## 4. Configuring external credentials

You must fill these into `.env` yourself. **Never commit `.env`.**

### Google OAuth
1. Go to Google Cloud Console → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID, type "Web application".
3. Add your frontend's callback URL as an Authorized redirect URI (e.g.
   `http://localhost:3000/auth/callback`) — **this is a frontend route**, not a backend
   one, because of how this project implements the Authorization Code + PKCE flow (see
   the OAuth flow explanation in the chat response).
4. Copy Client ID + Client Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Set `GOOGLE_REDIRECT_URI` to that same frontend callback URL.

### MongoDB
- Local: `MONGO_URI=mongodb://localhost:27017/gym_buddy`
- Atlas: use your Atlas connection string (whitelist your IP, create a DB user).

### Redis
- Local: `redis-server` then `REDIS_URL=redis://localhost:6379`
- Hosted (Upstash/Redis Cloud): use the provided connection URL.

### Cloudinary (profile images)
1. Sign up at cloudinary.com, get Cloud Name / API Key / API Secret from the dashboard.
2. Fill `CLOUDINARY_*` vars. If left blank, profile image upload endpoints will error
   but the rest of the app works fine.

### Firebase (push notifications)
1. Firebase Console → Project Settings → Service Accounts → Generate new private key.
2. From the downloaded JSON, copy `project_id`, `client_email`, `private_key` into the
   matching `FIREBASE_*` vars (keep the `\n` escapes in the private key).
3. If left blank, push notifications are silently skipped; in-app notifications still work.

## 5. Running tests

```bash
npm test
```

Tests use `mongodb-memory-server`, which downloads a MongoDB binary the first time you
run it — this requires outbound internet access once (it's cached afterward under
`~/.cache/mongodb-binaries`). If your environment blocks that download, either:
- run the tests somewhere with normal internet access once to seed the cache, or
- point `MONGOMS_SYSTEM_BINARY` at an existing local `mongod` binary.

Redis-dependent code (rate limiting) isn't exercised by the automated tests — verify
that manually via the Postman collection against `docker compose up`.

## 6. Postman

Import `postman/gym-buddy-backend.postman_collection.json`. Set the `baseUrl` variable
(defaults to `http://localhost:5000/api`). Enable Postman's cookie jar so `access_token`/
`refresh_token` cookies persist between requests, or copy `accessToken`/`refreshToken`
from the JSON response body and use a Bearer header (mobile-style testing).

## 7. Project structure

```
src/
  config/         # env validation, DB, Redis, Cloudinary, Firebase setup
  models/         # Mongoose schemas
  middleware/     # auth, validation, rate limiting, error handling, uploads
  utils/          # jwt, hashing, geo math, logger, response helpers
  sockets/        # Socket.IO server + chat event handlers
  modules/        # one folder per domain: auth, users, gyms, buddy, chat,
                  # workouts, checkins, notifications, reports, admin
  app.js          # Express app assembly (middleware + route mounting)
server.js         # process entrypoint (HTTP + Socket.IO + graceful shutdown)
tests/            # Jest unit + integration tests
postman/          # Postman collection
```

Each module folder follows the same shape: `*.routes.js` → `*.controller.js` →
`*.service.js` (+ `*.validators.js`). Routes wire up middleware and validation;
controllers translate HTTP ↔ service calls; services hold all business logic and are
the only layer that touches Mongoose models directly. This separation is what makes the
"convert modules into microservices later" story realistic — see the chat response's
microservices section.

## 8. API overview

All routes are prefixed with `/api`. Full request/response documentation for every
endpoint is in the accompanying chat explanation (section "API Routes"). Quick index:

- `POST /auth/google/init`, `POST /auth/google/callback`, `POST /auth/refresh`,
  `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`
- `GET/PATCH/DELETE /users/me`, `POST /users/me/profile-image`,
  `POST|DELETE /users/me/device-tokens`, `POST|DELETE /users/:userId/block`
- `GET /gyms`, `GET /gyms/nearby`, `GET /gyms/:id`, `POST /gyms`
- `GET /buddies/recommendations`, `GET /buddies/nearby`, `GET /buddies/requests`,
  `POST /buddies/requests/:userId`, `POST /buddies/requests/:requestId/accept|reject|cancel`,
  `DELETE /buddies/:userId` (unmatch)
- `GET|POST /conversations`, `GET /conversations/:id/messages`, `PATCH /conversations/:id/read`
- `POST|GET /workouts`, `GET|PATCH|DELETE /workouts/:id`, `POST|GET /workouts/logs`
- `POST|GET /checkins`
- `GET /notifications`, `PATCH /notifications/:id/read`
- `POST /reports`
- `GET /admin/reports`, `PATCH /admin/reports/:id`,
  `POST /admin/users/:userId/suspend|reactivate`

Socket.IO events (namespace `/`, authenticated at handshake): `conversation:join`,
`conversation:leave`, `message:send`, `message:typing`, `message:delivered`,
`message:read`, plus server-emitted `message:new`, `presence:update`.

## 9. What's next

See "Future improvements" in the chat explanation for a prioritized list of what's
deliberately out of scope for this MVP (maps/places API integration, offset vs cursor
pagination upgrade, admin dashboard UI, message media attachments, etc).
