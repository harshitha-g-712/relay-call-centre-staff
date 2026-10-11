# Relay — Call Centre Staff Frontend

A responsive, frontend-only call-centre staff workspace built with React, TypeScript, and Vite. It uses sample data and browser-side state; no backend is required by the assignment.

## Features
- Overview dashboard with support metrics, team activity, agent availability, and recent customer activity
- Call queue with sample incoming calls and simulated call-handling workflow
- Customers directory with search/filter and sample customer creation
- Messages inbox with sample conversations and reply composition
- Searchable knowledge base with demo article create/remove interactions
- Performance charts and service metrics
- Weekly schedule and shift display
- Agent settings for profile, availability, and notification preference
- Help & support guide interactions
- Responsive layout for desktop and smaller screens

## Run locally
Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually http://localhost:5173.

## Tests and production build
```bash
npm test
npm run build
```

## Data and limitations
This assignment asks for a frontend only, so the project uses sample data and client-side state. Calls are simulated; it does not connect to telephony, a live call queue, a backend, or a shared database. Some actions demonstrate interaction rather than saving to a server.

## AI tools used
- OpenAI ChatGPT — assistance with implementation planning, component code, styling, and documentation.
