# Join: Kanban Task Management App

Join is a responsive Kanban task management application that helps users organize, assign, and track work through an intuitive drag-and-drop board. It was built as a collaborative team project during the Fullstack/AI Software Developer program at **Developer Akademie**.

## About the Project

The goal of Join was to build a production-style task management application from scratch. The project covers account and guest authentication, contact management, task assignment, and a database-backed Kanban board. It focuses on reusable Angular components, reactive state management, responsive design, accessibility, automated testing, and a collaborative Git workflow.

## Features

- 🔐 **Authentication:** create an account, sign in with email and password, or use an isolated guest session
- 🧪 **Demo Data:** new accounts and guest sessions start with editable sample contacts and tasks
- 🗂️ **Drag-and-Drop Board:** search, reorder, and move tasks between status columns using drag and drop or mobile controls
- ✏️ **Task Management:** create, edit, and delete tasks with descriptions, priorities, due dates, categories, and subtasks
- 👥 **Task Assignment:** assign one or more contacts to a task
- 📇 **Contact Management:** create, edit, select, and remove contacts
- 📊 **Summary Dashboard:** view task metrics, urgent deadlines, and a personalized greeting
- 📱 **Responsive Design:** use the application across desktop, tablet, touch-laptop, and mobile layouts
- ☁️ **Persistent Storage:** store accounts, profiles, contacts, tasks, assignments, and subtasks with Supabase

## Tech Stack

### Frontend

![Angular](https://img.shields.io/badge/Angular_22-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white)

- Angular standalone components and Signals
- Angular Router and Signal Forms
- Angular CDK drag and drop
- TypeScript, RxJS, HTML, and SCSS

### Backend and Database

![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

- Supabase Auth for regular and anonymous guest sessions
- PostgreSQL for profiles, contacts, tasks, assignments, and subtasks
- Versioned SQL migrations, database functions, and atomic RPC operations
- Row Level Security policies for user-owned data

### Testing and Development Tools

![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

- Vitest and jsdom for unit and component tests
- Prettier for consistent source formatting
- Git and GitHub for version control and team collaboration

### Hosting

- Hetzner Webhosting
- Apache rewrite rules for Angular client-side routes
- Supabase-hosted authentication and PostgreSQL database

## Team

This project was built collaboratively by:

- **[Tobias Illner](https://github.com/TobiasIllnerDev)** — Supabase integration and migrations, authentication and guest sessions, data models and services, task creation, application layout, testing, and technical documentation
- **[Kamyar Zamanfar](https://github.com/kamycoding)** — Angular project foundation, shared UI components, sign-up, contact management, task forms, task details and editing, responsive behavior, and UI refinement
- **[Maik Radke](https://github.com/maikmuc80)** — Kanban board, search and drag-and-drop behavior, Summary dashboard, sidebar and navigation, routing, static-page foundations, and responsive improvements
- **[Valerij Markov](https://github.com/bmwx5777)** — initial login and session protection, application header, and mobile readability improvements for static content pages

## Getting Started

This project uses Angular CLI 22.1.4 and npm.

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm start
```

Open `http://localhost:4200/` in your browser. The application reloads automatically when source files change.

### Build for Production

```bash
npm run build
```

Build artifacts are stored in the `dist/` directory.

### Run Unit Tests

```bash
npm test -- --watch=false
```

### Format the Source Code

```bash
npm run format
```

## License

This non-commercial project was created for educational purposes as part of the Developer Akademie curriculum.
