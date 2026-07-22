# 🚛 Hours of Service (HOS) Trip Planner

> A modern full-stack web application that helps commercial truck drivers plan HOS-compliant trips with intelligent stop planning, route visualization, and Electronic Logging Device (ELD) log generation.

---

<img width="452" height="645" alt="image" src="https://github.com/user-attachments/assets/271e7b84-f14f-4f57-a754-f2bb1c763ba0" />

---
#  Walkthrough
https://www.loom.com/share/599014a710ab4598b11a27b5c44e867d
---

<img width="452" height="645" alt="image" src="https://github.com/user-attachments/assets/271e7b84-f14f-4f57-a754-f2bb1c763ba0" />

---
## 📌 Overview

The **Hours of Service (HOS) Trip Planner** is a full-stack route planning application designed to assist commercial drivers in planning trips while complying with Hours of Service regulations.

The application automatically calculates mandatory breaks, rest periods, fuel stops, and generates Electronic Logging Device (ELD) logs based on trip details.

---

## ✨ Features

- 🚛 HOS-compliant trip planning
- 🗺️ Interactive route visualization
- 📍 Intelligent stop recommendations
- ⏱️ Automatic break & rest scheduling
- 📄 Electronic Logging Device (ELD) log generation
- 📊 Trip summary dashboard
- ⚡ Fast and responsive user interface
- 🌐 Full-stack architecture

---

# 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Wouter
- Framer Motion

### Backend

- Node.js
- Express
- TypeScript
- PNPM Workspace

### Maps & Routing

- OpenStreetMap
- OSRM Routing Engine
- Nominatim Geocoding

---

# 📂 Project Structure

```text
Hos-Trip-Planner
│
├── artifacts/
│   ├── api-server
│   └── hos-planner
│
├── lib/
│   ├── api-client-react
│   ├── api-spec
│   ├── api-zod
│   └── db
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

- Node.js 22+
- PNPM

Install PNPM

```bash
npm install -g pnpm
```

---

## Installation

Clone the repository

```bash
git clone https://github.com/emaadi-source/Hos-Trip-Planner.git
```

Navigate to the project

```bash
cd Hos-Trip-Planner
```

Install dependencies

```bash
pnpm install
```

---

# ▶ Running the Application

## Backend

```bash
pnpm --filter @workspace/api-server run dev
```

---

## Frontend

```bash
pnpm --filter @workspace/hos-planner run dev
```

---

Open

```text
http://127.0.0.1:5173
```

---

# ⚙️ Key Functionalities

- Trip Planning
- Route Optimization
- HOS Compliance
- ELD Log Generation
- Stop Scheduling
- Trip Summary
- Interactive Maps

---

# 🌍 Future Improvements

- Live Traffic Integration
- Fuel Price Optimization
- Weather-aware Route Planning
- User Authentication
- Trip History
- Cloud Sync
- PDF Export

---

# 👨‍💻 Author

**M Immad**

CS Student

GitHub:
https://github.com/emaadi-source

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
