# 🕹️ BoredInCluj

> **Escape the daily grind. Step into the matrix.**
> Roll for a random sidequest in the city of Cluj, capture photographic evidence, and earn XP in the real world. Are you ready, Player One?
BoredInCluj is a full-stack, gamified social platform designed to turn everyday life into an RPG. Featuring a fully custom, Tailwind-free CSS UI inspired by retro arcades and cyberpunk aesthetics, powered by a modern Python/GraphQL backend.
---

## 🌟 Current Features

* **📡 City Comms (GraphQL Forum):** A fully functional social feed utilizing 1-to-many relationships (Posts -> Comments). Features backend pagination, frontend infinite scrolling (via Intersection Observer), and live basic statistics.
* **🎲 The Hub:** Roll a virtual token to receive a randomized real-world sidequest in Cluj.
* **📜 Guild Board:** A community bounty board where users can create, edit, delete, and claim custom quests.
* **👥 Social Matrix:** Manage your 4-player squad, track party experience distribution via visual bar charts, and handle LFG (Looking For Group) requests.
* **⚙️ Player Dossier:** Profile management system to update aliases, bios, and system configurations.
* **📱 Fully Responsive:** Custom CSS media queries ensure the retro-terminal aesthetic works flawlessly on both desktop monitors and mobile devices.

---

## 🛠️ Tech Stack

**Frontend (Client)**
- **Framework:** React 18 (via Vite)
- **Data Fetching:** Apollo Client (GraphQL)
- **Styling:** 100% Custom Vanilla CSS
- **Testing:** Vitest (Component/Hook coverage)

**Backend (Server)**
- **Framework:** Python + FastAPI
- **API Architecture:** Strawberry GraphQL (Queries & Mutations)
- **State Management:** Strict In-Memory RAM Storage (`fake_db` dictionaries) - *No hard drive persistence as per current assignment requirements.*
- **Testing:** Pytest + FastAPI TestClient (Endpoint & Schema coverage)

**E2E Automation**
- **Framework:** Playwright

## 🚀 Getting Started

### Installation

### 1. Booting the Backend (The Matrix)
Navigate to your backend directory and activate your Python environment:

```
# Install dependencies
pip install fastapi uvicorn strawberry-graphql pytest httpx

# Boot the GraphQL server
uvicorn main:app --reload
```
The GraphiQL interface will be live at `http://localhost:8000/graphql`

**Step 2: Install the dependencies and run the local development server**
```
npm install
npm run dev
```
**Step 3: Open your browser**
Navigate to `http://localhost:5173`.

> **Note on Persistence:** This application operates entirely in RAM. Data is volatile. If the Uvicorn server is restarted, the database is wiped clean.

---

## 🤖 Automated Testing

This project features maximum code coverage across the entire stack.

### Backend Testing:

Proves schema validation, CRUD operations, and pagination logic.

```
pytest test_main.py -v
```

### Frontend Unit Testing (Vitest):

Proves UI rendering, state management, and mocked Apollo/GraphQL interactions.

```
npm run test
npm run coverage
```

### End-To-End Testing (Playwright):

Proves complete system traversal without manual clicking

```
npx playwright test
```

---

## 🗺️ Roadmap (Next Steps)
- [ ] **Relational Persistence:** Replace the RAM-based fake_db with a true PostgreSQL database.
- [ ] **ORM Integration:** Implement SQLAlchemy models for quests, posts, and comments (guaranteeing 3rd Normal Form).
- [ ] **Automated Migrations:** Utilize Alembic to handle database schema generation.
*© 2026 BoredInCluj - Insert Coin to Continue*