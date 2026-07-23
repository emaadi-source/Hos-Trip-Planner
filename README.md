# 🚛 HOS Trip Planner

<p align="center">

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)

</p>

A modern full-stack web application that helps commercial truck drivers plan **Hours of Service (HOS)** compliant trips with intelligent stop planning, interactive route visualization, and Electronic Logging Device (ELD) log generation.

---

## 🌐 Live Demo

### Frontend

https://hos-trip-planner-hos-planner.vercel.app/

---

## 🎥 Project Walkthrough

https://www.loom.com/share/599014a710ab4598b11a27b5c44e867d

---

## 📸 Preview

<img width="452" height="645" alt="HOS Trip Planner" src="https://github.com/user-attachments/assets/271e7b84-f14f-4f57-a754-f2bb1c763ba0"/>

---

# 📌 Overview

The **HOS Trip Planner** is a full-stack route planning application designed for commercial truck drivers.

It assists drivers in planning safe and regulation-compliant trips by automatically calculating:

- Mandatory breaks
- Fuel stops
- Rest periods
- Driving limits
- Electronic Logging Device (ELD) logs

The application uses OpenStreetMap services for routing and geocoding while presenting an intuitive modern interface built with React.

---

# ✨ Features

- 🚛 HOS-compliant trip planning
- 🗺️ Interactive route visualization
- 📍 Intelligent stop recommendations
- ⛽ Fuel stop planning
- 🛌 Automatic rest scheduling
- ⏱️ Break management
- 📄 Automatic ELD log generation
- 📊 Trip summary dashboard
- ⚡ Fast and responsive interface
- 🌐 Full-stack architecture

---

# 🛠 Tech Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Wouter
- Framer Motion
- React Leaflet

---

## Backend

- Node.js
- Express.js
- TypeScript
- PNPM Workspaces

---

## Maps & Routing

- OpenStreetMap
- OSRM Routing Engine
- Nominatim Geocoding
- Leaflet

---

# 🏗 Project Architecture

```
Frontend (React + Vite)
        │
        ▼
Express REST API
        │
        ▼
Route Planning Logic
        │
        ▼
OSRM + Nominatim APIs
```

---

# 📂 Project Structure

```text
Hos-Trip-Planner
│
├── artifacts/
│   ├── api-server/          # Express Backend
│   └── hos-planner/         # React Frontend
│
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
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

## Clone Repository

```bash
git clone https://github.com/emaadi-source/Hos-Trip-Planner.git

cd Hos-Trip-Planner
```

---

## Install Dependencies

```bash
pnpm install
```

---

# ▶ Running the Application

## Start Backend

```bash
pnpm --filter @workspace/api-server dev
```

Runs on

```
http://localhost:3000
```

---

## Start Frontend

```bash
pnpm --filter @workspace/hos-planner dev
```

Runs on

```
http://localhost:5173
```

---

# ⚙️ How It Works

1. Enter trip details.
2. Select pickup and destination.
3. Provide current HOS cycle hours.
4. Application calculates:
   - Driving segments
   - Required breaks
   - Fuel stops
   - Rest periods
5. Generates:
   - Optimized trip plan
   - Route visualization
   - ELD logs
   - Trip summary

---

# 🚀 Deployment

| Service | Platform |
|----------|----------|
| Frontend | Vercel |
| Backend | Railway |
| Source Code | GitHub |

---

# 🌍 Future Improvements

- Live traffic integration
- Weather-aware routing
- Fuel price optimization
- Driver authentication
- Trip history
- Cloud synchronization
- PDF export
- Multi-day trip planning
- Mobile responsiveness improvements

---

# 👨‍💻 Author

**M. Immad**

Computer Science Student

GitHub

https://github.com/emaadi-source

---

# ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub!

Contributions, suggestions, and feedback are always welcome.
