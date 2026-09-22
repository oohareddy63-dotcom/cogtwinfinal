# 🧠 CogTwin — AI-Powered Digital Cognitive Twin for Brain Health Monitoring

> A web-based AI system that creates a personalized Digital Twin of your cognitive behavior using brain games, machine learning, Google Gemini AI, and Groq AI.

**Live Demo:** https://cognitivetwin-2.onrender.com

---

## Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Project Structure](#-project-structure)
6. [Database Schema](#-database-schema)
7. [API Reference](#-api-reference)
8. [ML & AI Pipeline](#-ml--ai-pipeline)
9. [Installation & Setup](#-installation--setup)
10. [Running the Project](#-running-the-project)
11. [Pages & Features](#-pages--features)
12. [Environment Variables](#-environment-variables)
13. [Deployment on Render](#-deployment-on-render)

---

## 🎯 Project Overview

**CogTwin** is an AI-powered web application that monitors brain health by having users complete 5 interactive cognitive tests regularly. The system:

- Creates a **personalized Digital Twin** — a TensorFlow.js neural network model trained on each user's cognitive history
- Detects **early signs of cognitive decline** using z-score anomaly detection
- Provides **AI-generated insights and chat** powered by **Google Gemini** (`gemini-3.6-flash`)
- Generates **fresh test questions every session** using **Groq AI** (`groq/compound-mini`)
- Sends **weekly reminders** to ensure consistent testing
- Tracks **trends over time** using linear regression
- Generates **PDF health reports** for sharing with doctors

### Problem Statement
Traditional brain health monitoring requires expensive MRI scans and clinical visits. CogTwin provides an **affordable, non-invasive, continuous** monitoring system accessible from any device.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎮 **5 Cognitive Tests** | Reaction Time, Memory Recall, Pattern Recognition, Attention Span, Decision Making |
| 🤖 **AI-Generated Questions** | Pattern Recognition and Decision Making questions generated fresh by Groq AI every session |
| 🧬 **Personal Baseline** | Established after 3 sessions — compares YOU to YOUR own history |
| 🧠 **Digital Twin (TF.js)** | Neural network trained on your session data with honest 80/20 holdout accuracy |
| 📊 **Anomaly Detection** | Z-score based detection flags deviations > 1.5 standard deviations |
| 📈 **Trend Analysis** | Linear regression with 7-day and 30-day forecasts |
| 💬 **Gemini AI Chat** | Ask any cognitive health question — answered by Google Gemini using your real data |
| 🔍 **AI Insights** | Personalized insights, recommendations, anomaly explanations, weekly reports |
| ⏰ **Weekly Reminders** | Configurable reminders when assessment is overdue |
| 🔔 **Smart Notifications** | Anomaly alerts, baseline milestones, decline warnings |
| 📄 **PDF Reports** | Export full cognitive health report to share with doctors |
| 🔐 **Secure Auth** | JWT authentication with bcrypt password hashing |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  Dashboard │ Tests │ AI Twin │ AI Chat │ Reports │ Settings  │
└─────────────────────┬───────────────────────────────────────┘
                      │ Vite Proxy /api → :5000
┌─────────────────────▼───────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                │
│                                                              │
│  /api/auth  /api/tests  /api/dashboard  /api/ml  /api/ai    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ML ENGINE (TensorFlow.js + simple-statistics)        │   │
│  │  Anomaly Detection │ Trend Analysis │ Neural Network  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GEMINI AI (gemini-3.6-flash)                         │   │
│  │  Chat │ Insights │ Recommendations │ Reports          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GROQ AI (groq/compound-mini)                         │   │
│  │  Pattern Questions │ Decision Questions               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SCHEDULER — runs every hour, sends reminders         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Mongoose ODM
┌─────────────────────▼───────────────────────────────────────┐
│                  MongoDB Atlas (Cloud)                       │
│  Users │ Sessions │ TestResults │ DigitalTwin │ Notifs      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool + dev proxy |
| Tailwind CSS | 3.4 | Styling |
| shadcn/ui | latest | UI components |
| Framer Motion | 12 | Animations |
| Recharts | 3.8 | Data visualization |
| React Router | 6.30 | Client-side routing |
| TanStack Query | 5.83 | Server state management |
| jsPDF | 4.2 | PDF report generation |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | v24 | Runtime |
| Express.js | 4.18 | Web framework |
| MongoDB Atlas | Cloud | Database |
| Mongoose | 8.4 | ODM |
| JWT | 9.0 | Authentication |
| bcryptjs | 2.4 | Password hashing |
| dotenv | 16.4 | Environment config |

### ML & AI
| Technology | Purpose |
|-----------|---------|
| TensorFlow.js 4.22 | Digital Twin neural network |
| simple-statistics | Feature extraction, regression |
| mathjs | Mathematical operations |
| **Google Gemini** (`gemini-3.6-flash`) | AI Chat, insights, recommendations, reports |
| **Groq AI** (`groq/compound-mini`) | Dynamic test question generation |

---

## 📁 Project Structure

```
digital-cognitive-twin/
├── README.md
├── render.yaml                        ← Render deployment config
│
├── backend/
│   ├── server.js                      ← Express app entry point
│   ├── scheduler.js                   ← Weekly reminder scheduler
│   ├── .env                           ← Environment variables (not committed)
│   ├── package.json
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── TestResult.js
│   │   ├── Session.js
│   │   ├── DigitalTwin.js
│   │   └── ReminderSettings.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tests.js                   ← includes /questions/:type (AI questions)
│   │   ├── dashboard.js
│   │   ├── profile.js
│   │   ├── ml.js
│   │   ├── ai.js                      ← Gemini AI endpoints
│   │   ├── notifications.js
│   │   └── reminders.js
│   │
│   ├── ml/
│   │   ├── cognitiveEngine.js         ← TF.js neural network + ML engine
│   │   ├── groqAI.js                  ← Google Gemini integration
│   │   └── questionGenerator.js      ← Groq AI question generation
│   │
│   └── middleware/
│       └── auth.js
│
└── frontend/
    ├── vite.config.ts
    └── src/
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── CognitiveTestsPage.tsx ← AI-generated questions
        │   ├── DigitalTwinPage.tsx
        │   ├── AIChatPage.tsx         ← Gemini AI chat
        │   ├── ReportsPage.tsx
        │   ├── ProfilePage.tsx
        │   └── SettingsPage.tsx
        ├── components/
        │   ├── Navbar.tsx
        │   └── ui/
        ├── contexts/
        │   └── AuthContext.tsx
        └── lib/
            └── api.ts
```

---

## 🗄 Database Schema

### User
```js
{
  name, email, password (bcrypt),
  baseline: { established, sessionsCompleted, memory, reaction, pattern, attention, decision, overall },
  streak: { current, lastTestDate }
}
```

### TestResult
```js
{
  userId, testType, score (0-100), durationSeconds, sessionId,
  anomaly: { detected, zScore, severity, direction },
  deviationFromBaseline
}
```

### Session
```js
{
  userId, sessionId (UUID),
  scores: { memory, reaction, pattern, attention, decision },
  overallScore, testsCompleted, isComplete,
  insights: [{ type, title, description }]
}
```

### DigitalTwin
```js
{
  userId, weights (TF.js serialized), accuracy (R² holdout),
  trainedOn, lastTrained,
  featureStats: { memory: { mean, stdDev, consistency, trendSlope }, ... },
  trendAnalysis: { slope, r2, direction, predicted7Day, predicted30Day }
}
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | ❌ |
| POST | `/api/auth/login` | ❌ |
| GET | `/api/auth/me` | ✅ |
| PATCH | `/api/auth/update-profile` | ✅ |

### Tests
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/tests/submit` | Submit score | ✅ |
| GET | `/api/tests/history` | Test history | ✅ |
| GET | `/api/tests/sessions` | Sessions list | ✅ |
| GET | `/api/tests/questions/:type` | **AI-generated questions** (pattern/decision) | ✅ |

### AI (Gemini)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/ai/insights` | Personalized insights | ✅ |
| POST | `/api/ai/recommendations` | Smart recommendations | ✅ |
| POST | `/api/ai/explain-anomaly` | Explain anomaly | ✅ |
| GET | `/api/ai/weekly-report` | Weekly summary | ✅ |
| POST | `/api/ai/ask` | Chat with Gemini | ✅ |

### ML / Digital Twin
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/ml/twin` | ✅ |
| POST | `/api/ml/train` | ✅ |
| GET | `/api/ml/analyze` | ✅ |
| GET | `/api/ml/predict` | ✅ |

---

## 🤖 ML & AI Pipeline

### 1. Feature Extraction
Extracts mean, median, stdDev, consistency, trend slope per test type from session history.

### 2. Anomaly Detection (Z-Score)
```
z = (current - baseline_mean) / std_deviation
|z| > 1.5 → Mild  |z| > 2.0 → Moderate  |z| > 2.5 → Severe
```

### 3. Trend Analysis (Linear Regression)
Linear regression over last 20 sessions → slope, R², direction, 7-day and 30-day forecasts.

### 4. Digital Twin (TensorFlow.js Neural Network)
```
Input:  [memory, reaction, pattern, attention, decision, sessionIdx, dayOfWeek, hour]
Layers: Dense(32,relu) → Dense(16,relu) → Dense(1,sigmoid)
Train:  Adam, MSE, 100 epochs on 80% of sessions
Accuracy: R² on held-out 20% (displayed as 40–92% range)
```

### 5. Gemini AI (`gemini-3.6-flash`)
Used for: AI Chat, personalized insights (JSON), smart recommendations, anomaly explanations, weekly reports, health risk analysis.

### 6. Groq AI (`groq/compound-mini`)
Used for: Generating fresh Pattern Recognition and Decision Making questions on every test start. Different questions each session — never repeats.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free)
- Google Gemini API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free, no expiry)
- Groq API key — [console.groq.com](https://console.groq.com) (free)

### Step 1 — Clone
```bash
git clone https://github.com/oohareddy63-dotcom/cogtwin.git
cd cogtwin
```

### Step 2 — Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cogtwin
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

### Step 3 — Frontend
```bash
cd frontend
npm install
```

---

## ▶ Running the Project

### Terminal 1 — Backend
```bash
cd backend
node server.js
```
```
✅ MongoDB Atlas connected
🚀 Backend  →  http://localhost:5000
📡 Health   →  http://localhost:5000/api/health
⏰ Reminder scheduler started
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```
```
VITE v5.4.21  ready in 800ms
➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## 📱 Pages & Features

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Homepage with features overview |
| Login | `/login` | Sign in with JWT |
| Register | `/register` | Create account |
| Dashboard | `/dashboard` | Scores, trends, AI insights, anomaly alerts |
| Tests | `/tests` | Take all 5 cognitive tests |
| AI Twin | `/twin` | Digital Twin model, predictions, feature stats |
| AI Chat | `/ai-chat` | Chat with Gemini about your brain health |
| Reports | `/reports` | History table, monthly trends, PDF export |
| Profile | `/profile` | Stats, streak, baseline status |
| Settings | `/settings` | Reminder config, notification preferences |

### The 5 Tests
| Test | Measures | How |
|------|----------|-----|
| Reaction Time | Processing speed | Click when screen turns green (3 rounds) |
| Memory Recall | Short-term memory | Memorize and retype digit sequences (5 rounds) |
| Pattern Recognition | Logical reasoning | **Groq AI generates fresh sequences** (5 rounds) |
| Attention Span | Focus & tracking | Click moving target in 20 seconds |
| Decision Making | Quick judgment | **Groq AI generates fresh questions** (5 rounds, 6s each) |

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Frontend URL for CORS |
| `GEMINI_API_KEY` | Google Gemini API key (AI chat + insights) |
| `GROQ_API_KEY` | Groq API key (test question generation) |

---

## ☁️ Deployment on Render

The `render.yaml` in the root configures both services automatically.

### Backend (Web Service)
- Root: `backend/`
- Build: `npm install`
- Start: `node server.js`
- Add all env vars in Render Dashboard → Environment

### Frontend (Static Site)
- Root: `frontend/`
- Build: `npm install && npm run build`
- Publish: `dist/`
- Env var: `VITE_API_URL=https://digital-cognitive-twin.onrender.com`

### MongoDB Atlas
Allow all IPs: Network Access → Add IP → `0.0.0.0/0`

---

## 📊 Scoring System

| Range | Status |
|-------|--------|
| 85–100 | 🟢 Excellent |
| 70–84 | 🟡 Good |
| 50–69 | 🟠 Fair |
| 0–49 | 🔴 Poor |

---

## 🔒 Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT tokens expire in 7 days
- Rate limiting: 1000 req / 15 min per IP
- `.env` never committed to git

---

## 👥 Team

**Department of Computer Science and Engineering**
**AIT — Academic Year 2025–26**

---

*Built with ❤️ using React, Node.js, MongoDB, TensorFlow.js, Google Gemini, and Groq AI*
