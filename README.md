# ⚡ Zenith Chat — Real-Time Core Engine & API Gateway (Backend)

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

> High-throughput, low-latency communication engine powering **Zenith Chat**. Built with Node.js, Express, TypeScript, and MongoDB Atlas with native WebSockets architecture.

---

## 🔗 Connected Ecosystem
- 💻 **Frontend Client Repository (Next.js 16):** [https://github.com/21399codenobody/zenithchat-frontend](https://github.com/21399codenobody/zenithchat-frontend)
- 🌐 **Live Web Application:** [https://zenithchat.vercel.app](https://zenithchat.vercel.app)

---

## 🏗️ Core Backend Capabilities & System Design

### 1. Multi-Device Real-Time Presence Engine
- **Memory Optimization:** Uses an in-memory `Map<string, Set<string>>` mapping to track multiple concurrent socket connections per user.
- **Fail-Safe Presence:** Prevents premature offline status when users switch between desktop and mobile or close one of several active browser tabs.

### 2. Passwordless Phone Auth with E.164 Sanitation
- Integrated with **`libphonenumber-js`** to parse, validate, and standardize incoming phone numbers into international **E.164** format.
- Automated client prefix stripping (national `0` prefixes) ensuring zero database duplicate anomalies.
- **MongoDB TTL (Time-To-Live) Index:** Otp documents automatically expire and self-destruct from the database after 300 seconds (5 minutes).

### 3. High-Performance Database Indexing (Mongoose)
- **Compound Query Optimization:** `{ chatId: 1, createdAt: -1 }` on messages collection enables sub-millisecond paginated history retrieval.
- **Sparse Indexing:** `{ userName: 1, sparse: true }` avoids duplicate null collisions during phone-based on-boarding.
- **Text Search Indexes:** Full-text indexing on supergroups and broadcast channels for instant global discovery.

### 4. Role-Based Access Control (RBAC) & Governance
- **Supergroups & Channels:** Distinct permission tiers for Creators/Owners, Authorized Admins, and Members.
- **Cryptographic Invite Generator:** 10-character URL-safe random tokens (`crypto.randomBytes`) with automated usage limits and expiry tracking.
- **Anti-Spam Slow Mode:** Database-level enforcement of message throttling intervals (`5s`, `10s`, `30s`, `1m`).

---

## 🌐 API Route Directory (REST Endpoints)

| Module | Route Prefix | Primary Operations |
| :--- | :--- | :--- |
| **Authentication** | `/api/auth` | Phone OTP dispatch (`/send-otp`), verification (`/verify-otp`), profile onboarding (`/complete-profile`) |
| **Direct Chats** | `/api/chats` | Retrieve user inbox, access/create 1-on-1 chats, saved cloud messages |
| **Messaging** | `/api/messages` | Send message, get paginated chat history, delete message, emoji reactions |
| **User Directory** | `/api/users` | Phonebook sync (`/sync-contacts`), get user profile, privacy settings, block/unblock |
| **Stories Suite** | `/api/stories` | Post 24h photo/video story, get contact story feed, view story, delete story |
| **Supergroups** | `/api/groups` | Create group, manage members (kick/ban), promote/demote admins, slow mode, leave group |
| **Channels** | `/api/channels` | Create channel, subscribe/unsubscribe, post broadcast, manage moderators |
| **Invite Links** | `/api/invites` | Generate 10-char smart invite link, consume link, handle join approval requests |
| **Global Search** | `/api/search` | Search verified people by `@username`, public groups, and channels |

---

## 📡 WebSockets Gateway Events (Socket.io)
Client ──( join_chat )────────────────> Joins active chat room
Client ──( send_message )─────────────> Broadcasts to room (receive_message)
Client ──( typing_start / stop )──────> Broadcasts typing indicator (user_typing)
Client ──( message_reaction_updated )─> Broadcasts reaction change (receive_reaction)
Client ──( call_user )────────────────> Sends WebRTC signaling payload (incoming_call)
Client ──( answer_call )──────────────> Notifies caller of acceptance (call_accepted)
Client ──( end_call / reject_call )───> Tears down peer session & logs call history
code
Code
---

## 🛠️ Local Development & Installation

### 1. Clone & Install
```bash
git clone https://github.com/your-username/zenithchat-backend.git
cd zenithchat-backend
npm install
2. Environment Configuration
Create a .env file in the root folder:
code
Env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/zenith_chat_db?retryWrites=true&w=majority
JWT_SECRET=your_ultra_secure_jwt_secret_key_2025
CLIENT_URL=http://localhost:3000
3. Run Development Server
code
Bash
# Start in watch mode
npm run dev

# Build for production
npm run build

# Start production build
npm start
🔒 Security Measures Implemented
express-rate-limit: Brute-force protection on phone verification and password recovery endpoints.
CORS Protection: Whitelists allowed client domains in production environments.
Trust Proxy Configuration: Resolves accurate client IPs behind reverse proxies (Nginx / Cloudflare / Render).
Body Parsing Thresholds: Safe 10MB payload cap preventing denial-of-service memory exhaustion.
👨‍💻 Developed By
GitHub: 21399codenobody
LinkedIn: https://www.linkedin.com/in/omar-khattab-safar
