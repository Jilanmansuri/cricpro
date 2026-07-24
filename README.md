# CricStats Pro

**CricStats Pro** is a complete, production-ready cricket statistical management suite. It features automated match scorecard parsing using client-side image processing, remote Optical Character Recognition (OCR), smart phonetic player matching, Net Run Rate (NRR) calculators, and tournament Cap leaderboards.

---

## 🏗️ Folder Structure

```
cricpro/
├── backend/                    # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/             # DB configurations & structured winston logging
│   │   ├── controllers/        # Thin endpoint request wrappers
│   │   ├── middlewares/        # JWT Protectors, role checks, and error logging
│   │   ├── models/             # Mongoose schemas for all 15 collections
│   │   ├── repositories/       # Generic BaseRepository CRUD abstractions
│   │   ├── routes/             # REST endpoint bindings
│   │   ├── services/           # Core calculations, matching & OCR engines
│   │   ├── types/              # TS interface contracts
│   │   ├── utils/              # PDF / CSV exporters
│   │   └── server.ts           # Server entry point
│   ├── Dockerfile
│   └── docker-compose.yml
└── frontend/                   # React Native + Expo SDK 54 + TypeScript App
    ├── app/                    # Expo Router stack, drawer, and tab directories
    ├── components/             # Reusable UI cards, inputs, and custom SVG charts
    ├── services/               # Axios networking layers & offline sync queues
    └── store/                  # Zustand state stores (Auth, Settings, Drawer)
```

---

## ⚡ Core Engine Features

### 1. Smart Player Matching
- Combines exact case-insensitive matches, initials abbreviation comparison (e.g. `VK` matches `Virat Kohli`), and phonetic matching (using **Soundex** algorithms) to prevent duplicate profiles.

### 2. Match Merging
- Offers duplicate match warnings (compares venue, date, teams). Merging updates the matching scorecard records and sums statistics in-place without generating a new match ID, preserving league standing reference integrity.

### 3. Exporters & AI Insights
- Custom CSV and HTML scorecard builders.
- A rule-based AI engine analyzing averages, strike rates, and economies to compile strengths, weaknesses, and improvement advice.

---

## 🛠️ Installation & Running

### Prerequisites
- Node.js v20+
- MongoDB instance (running locally or via Docker)

### 1. Start Backend API
```bash
cd backend
npm install
npm run dev
```
Define `.env` with Mongo connection details, Cloudinary setups, and JWT secret keys.

### 2. Start Frontend App
```bash
cd ../frontend
npm install
npx expo start
```
Runs the React Native layout on Web, iOS, or Android devices.
