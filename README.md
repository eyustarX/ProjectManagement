# PlanAlpha - Collaborative Project Management Platform 📊

[![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)](https://github.com/eyustarX/ProjectManagement)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Jest-Passing-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

A modern, full-stack collaborative project management and team workspace application inspired by industry tools like **Trello** and **Asana**. Built with **Node.js, Express.js, Socket.io, PostgreSQL (Neon Cloud), Prisma ORM v6, and modern Vanilla JavaScript**. The platform enables distributed teams to create group projects, manage workflow columns on interactive Kanban boards with drag-and-drop, assign task cards with priorities and deadlines, engage in threaded discussions, and synchronize board updates in real-time using **WebSockets**.

---

## 🚀 Key Features

- **Collaborative Group Workspaces**:
  - Create and manage projects with custom titles, descriptions, and dynamic team membership.
  - Role-Based Access Control (**RBAC**): `OWNER`, `ADMIN`, and `MEMBER` permissions.
  - Teammate invitations with instant user search or direct email lookup.
- **Interactive Kanban Boards & Task Cards**:
  - Horizontally scrollable workflow columns (e.g., *To Do*, *In Progress*, *In Review*, *Done*).
  - Ability to add, rename, and customize workflow columns on the fly.
  - Task cards featuring title, description, priority badges (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), due dates, assignee avatars, and comment counters.
  - Interactive card movements across columns via native HTML5 drag-and-drop or column selection dropdown.
- **Task Communications & Discussion Threads**:
  - In-task threaded comments for discussions, updates, and team feedback.
  - Author-level deletion controls and audit timestamps.
  - Comprehensive project activity logs capturing who created, moved, or commented on tasks.
- **Real-Time Synchronization via WebSockets (`Socket.io`)**:
  - Room-based bi-directional communication scoped to each project (`project_<id>`).
  - Live card creations, movements, updates, and deletions reflect instantly across all connected teammates without page reloads.
  - Real-time toast notifications for new task assignments, project invites, and team comments.
- **Security & User Management**:
  - Secure authentication using **JWT** and salted **bcryptjs** password hashing.
  - Centralized middleware enforcing authorization, project boundary isolation, and error handling.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Runtime** | Node.js (v18+), Express.js (CommonJS), HTTP Server |
| **Real-Time Engine** | Socket.io (WebSocket bi-directional event broadcasting) |
| **Database & ORM** | PostgreSQL (Neon Serverless Cloud), Prisma ORM v6 (`@prisma/client`) |
| **Authentication** | JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`) |
| **Testing Suite** | Jest, Supertest (27 automated integration tests) |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 Custom Properties, Socket.io Client |

---

## 🏛️ System & Real-Time Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Client                       │
│    (HTML5, CSS3, Vanilla JS Fetch API, Socket.io Client)    │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST Requests            │ WebSocket Events
               ▼                               │ (task:moved, comment:created, etc.)
┌──────────────────────────────────────────────┴──────────────┐
│                    Express + Socket.io Server               │
│   ├── JWT Authentication & Permission Gatekeepers           │
│   ├── REST Controllers: /auth, /projects, /tasks, /comments │
│   └── WebSocket Rooms: project_<id> & user_<id>             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma Client v6
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               PostgreSQL Database (Neon Cloud)              │
│   ├── pm_users          ├── pm_projects                     │
│   ├── pm_project_members├── pm_task_lists                   │
│   ├── pm_tasks          ├── pm_comments                     │
│   └── pm_activity_logs  (Isolated pm_* table namespaces)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema & Entity Relationships

```mermaid
erDiagram
    USER ||--o{ PROJECT : "owns"
    USER ||--o{ PROJECT_MEMBER : "participates in"
    USER ||--o{ TASK : "creates / assigned to"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ ACTIVITY_LOG : "triggers"

    PROJECT ||--o{ PROJECT_MEMBER : "has members"
    PROJECT ||--o{ TASK_LIST : "contains columns"
    PROJECT ||--o{ TASK : "tracks"
    PROJECT ||--o{ ACTIVITY_LOG : "audits"

    TASK_LIST ||--o{ TASK : "groups"
    TASK ||--o{ COMMENT : "has discussion"
    TASK ||--o{ ACTIVITY_LOG : "has history"

    USER {
        uuid id PK
        string name
        string email UK
        string passwordHash
        string avatarUrl
        datetime createdAt
    }

    PROJECT {
        uuid id PK
        string name
        string description
        uuid ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    PROJECT_MEMBER {
        uuid id PK
        uuid projectId FK
        uuid userId FK
        enum role "OWNER | ADMIN | MEMBER"
        datetime joinedAt
    }

    TASK_LIST {
        uuid id PK
        uuid projectId FK
        string name
        int position
        datetime createdAt
    }

    TASK {
        uuid id PK
        uuid projectId FK
        uuid listId FK
        uuid creatorId FK
        uuid assigneeId FK
        string title
        string description
        enum priority "LOW | MEDIUM | HIGH | URGENT"
        datetime dueDate
        int position
        datetime createdAt
    }

    COMMENT {
        uuid id PK
        uuid taskId FK
        uuid authorId FK
        string content
        datetime createdAt
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid projectId FK
        uuid taskId FK
        uuid userId FK
        string action
        string details
        datetime createdAt
    }
```

---

## 📂 Project Directory Structure

```
ProjectManagement/
├── backend/
│   ├── prisma/
│   │   ├── applyMigration.js       # Safe DDL migration script for Neon
│   │   └── schema.prisma           # Prisma v6 models with pm_* namespace
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.js           # Prisma client singleton
│   │   ├── controllers/
│   │   │   ├── authController.js   # Register, Login, Me handlers
│   │   │   ├── projectController.js# Projects & collaborative membership
│   │   │   ├── taskController.js   # Kanban lists & task cards
│   │   │   ├── commentController.js# Threaded task comments & activities
│   │   │   └── userController.js   # Member search
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT token verification
│   │   │   └── errorHandler.js     # Centralized 404 & error handlers
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # /api/v1/auth
│   │   │   ├── projectRoutes.js    # /api/v1/projects
│   │   │   ├── taskRoutes.js       # /api/v1/projects/:id/tasks & lists
│   │   │   ├── commentRoutes.js    # /api/v1/tasks/:id/comments
│   │   │   └── userRoutes.js       # /api/v1/users/search
│   │   ├── services/
│   │   │   ├── authService.js      # Auth business logic
│   │   │   ├── projectService.js   # Group projects, members, & RBAC
│   │   │   ├── taskService.js      # Kanban columns & card logic
│   │   │   ├── commentService.js   # Discussion threads & activity logs
│   │   │   └── userService.js      # User directory search
│   │   ├── sockets/
│   │   │   └── socketHandler.js    # Socket.io room management & event broadcasting
│   │   ├── utils/
│   │   │   └── authUtils.js        # bcrypt hashing and JWT tokens
│   │   ├── app.js                  # Express app & route mounting
│   │   └── server.js               # HTTP + Socket.io Server bootstrap
│   ├── tests/
│   │   └── api.test.js             # 27 Jest + Supertest integration tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css               # Kanban board & design system styles
│   ├── js/
│   │   ├── api.js                  # Fetch wrapper with Bearer token injection
│   │   ├── auth.js                 # Session management & dynamic navigation
│   │   ├── board.js                # Kanban board controller & drag-drop engine
│   │   └── socket.js               # Socket.io client & toast notification system
│   └── pages/
│       ├── index.html              # Projects workspace dashboard & creation modal
│       ├── login.html              # User login page
│       ├── register.html           # User signup page
│       └── board.html              # Interactive Kanban board & task modal
├── .gitignore
└── README.md
```

---

## 📡 REST API Reference

All routes are prefixed with `/api/v1`.

### 1. Authentication & Users
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | No | Register new user account |
| `POST` | `/auth/login` | No | Authenticate user and receive JWT |
| `GET` | `/auth/me` | **Yes** | Fetch current user profile & workspace counts |
| `GET` | `/users/search?q=` | **Yes** | Search registered users by name or email |

### 2. Projects & Collaborators (`/projects`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/projects` | **Yes** | Create new project with default Kanban lists |
| `GET` | `/projects` | **Yes** | List all projects where user is owner or member |
| `GET` | `/projects/:id` | **Yes** | Get full board (columns, task cards, members) |
| `PUT` | `/projects/:id` | **Yes** | Update project title / description (`OWNER`/`ADMIN`) |
| `DELETE` | `/projects/:id` | **Yes** | Delete project (`OWNER` only) |
| `POST` | `/projects/:id/members` | **Yes** | Invite teammate by email or user ID |
| `DELETE` | `/projects/:id/members/:memberId` | **Yes** | Remove member or leave project |
| `PATCH` | `/projects/:id/members/:memberId/role` | **Yes** | Update member role (`OWNER` only) |

### 3. Kanban Columns & Task Cards
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/projects/:projectId/lists` | **Yes** | Create a new workflow column |
| `PATCH` | `/lists/:id` | **Yes** | Update column name or position |
| `DELETE` | `/lists/:id` | **Yes** | Delete column and associated tasks |
| `POST` | `/projects/:projectId/tasks` | **Yes** | Create a new task card |
| `GET` | `/tasks/:id` | **Yes** | Get task details, assignee, & comments |
| `PATCH` | `/tasks/:id` | **Yes** | Update task (move column, change priority/assignee) |
| `DELETE` | `/tasks/:id` | **Yes** | Delete task card |

### 4. Comments & Activity Logs
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/tasks/:taskId/comments` | **Yes** | Add a comment to a task discussion |
| `GET` | `/tasks/:taskId/comments` | **Yes** | List all comments for a task |
| `DELETE` | `/comments/:id` | **Yes** | Delete comment (author or admin) |
| `GET` | `/projects/:projectId/activities`| **Yes** | Retrieve project activity audit feed |

---

## ⚡ WebSocket Events (`Socket.io`)

| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `join_project` | Client ➔ Server | `{ projectId, user }` | Joins the real-time project room |
| `leave_project` | Client ➔ Server | `{ projectId }` | Leaves the project room |
| `task:created` | Server ➔ Room | Task Object | Emitted when a teammate creates a new card |
| `task:moved` | Server ➔ Room | Task Object | Emitted when a card is moved across columns |
| `task:updated` | Server ➔ Room | Task Object | Emitted when task fields (priority, title) change |
| `task:deleted` | Server ➔ Room | `{ taskId }` | Emitted when a card is removed from board |
| `comment:created` | Server ➔ Room | `{ comment, taskId }` | Broadcasts new comment to active viewers |
| `comment:deleted` | Server ➔ Room | `{ commentId, taskId }`| Removes deleted comment from view |
| `member:added` | Server ➔ Room | Member Object | Broadcasts when a new teammate joins |
| `notification:received`| Server ➔ User | Notification Object | Direct notification for task assignments |

---

## 💻 Local Setup & Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [PostgreSQL](https://www.postgresql.org/) database or a free [Neon](https://neon.tech) cloud database

### 2. Clone the Repository
```bash
git clone https://github.com/eyustarX/ProjectManagement.git
cd ProjectManagement
```

### 3. Backend Setup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your PostgreSQL database connection URL and JWT secret:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="postgresql://user:password@ep-host.neon.tech/neondb?sslmode=require"
   JWT_SECRET="your_secret_key"
   CLIENT_URL="http://localhost:3000"
   ```

4. Generate Prisma Client and apply migrations:
   ```bash
   npx prisma generate
   node prisma/applyMigration.js
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API and WebSocket server will run on `http://localhost:5000`.

### 4. Launching the Frontend
Serve the `frontend/` directory with any static server or VS Code **Live Server**:
```bash
cd ../frontend
npx serve .
# Open http://localhost:3000/pages/index.html in your browser
```

---

## 🧪 Automated Testing

The backend includes a comprehensive 27-test integration suite covering all modules:
```bash
cd backend
npm test
```

### Test Coverage Summary:
- ✅ **API Health & Base Routes**: Confirms server readiness and versioning.
- ✅ **Authentication**: Validates registration, duplicate email rejection, password hashing, and JWT authorization.
- ✅ **Group Projects & Memberships**: Tests project creation with auto-generated Kanban lists, member invitations, duplicate invite protection, and RBAC permission checks.
- ✅ **Kanban Tasks & Columns**: Tests column creation, card publishing, assignee assignment validation, and card movement across columns.
- ✅ **Threaded Comments & Audit Logs**: Validates comment posting, comment deletion authorization, and project activity audit tracking.
- ✅ **Idempotent Teardown**: Automatically cascades and deletes test users and database records upon completion.

---

## 📄 License
This project is open-source and distributed under the [MIT License](LICENSE).
