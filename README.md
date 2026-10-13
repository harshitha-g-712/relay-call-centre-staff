# Relay — Call Centre Staff App

A responsive React + TypeScript call-centre workspace with a separate live-calling lab.

## Feature status and scope

### Live calling lab

- **Human-to-human audio:** real browser microphone audio using WebRTC peer connections and Socket.IO signaling. Both participants must join the same room while the backend is running.
- **AI voice assistant:** browser speech recognition captures a spoken turn, the Node backend calls OpenRouter, and browser speech synthesis reads the response aloud. A working OpenRouter API key and a model available to that account are required.
- **Call controls:** mute/unmute and end call for human calls; end session and per-turn listening for the AI assistant.
- **Room limit:** the signaling server accepts up to two participants in a room.

### Call-centre workspace

The queue, customer, messages, knowledge-base, performance, schedule, and settings screens are a **frontend demo with sample workspace data**. The queue call controls do not dial customers and do not create a real telephone call.

### Not included

This project does **not** dial ordinary mobile or landline numbers (PSTN). Web-to-phone and AI-to-phone calling require a telephony provider, backend voice webhooks, provider credentials, and usually paid credits. Do not present phone-number calling as implemented.

## Requirements

- Node.js 18 or later (Node.js 20+ recommended)
- npm
- Current Chrome or Edge recommended for browser speech recognition
- Microphone permission
- Optional OpenRouter API key for live AI responses

Use `localhost` during development or HTTPS in deployment. Browsers normally restrict microphone and speech features on insecure origins.

## Setup and run

1. Extract the ZIP and open a terminal in the project root (the folder containing `package.json`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the backend in terminal 1:

   ```bash
   npm run server
   ```

   It listens on `http://localhost:8787` by default. Verify it at `http://localhost:8787/health`; a healthy response looks like `{"ok":true,"service":"relay-calling-backend"}`.

4. Start the frontend in terminal 2:

   ```bash
   npm run dev
   ```

5. Open the local Vite URL printed in the terminal (normally `http://localhost:5173`). Select **Live calling** in the sidebar.

You can also run `npm run dev:all` to start the frontend and backend together if your environment supports the concurrently script.

## Test a real human-to-human call

1. Start the backend and frontend.
2. Open the site in two separate browser sessions (for example, Chrome and Edge, or a normal window and a private window). If testing on two devices, both devices must be able to reach the backend.
3. On both sessions, choose **Live calling → Human to human**. Enter the exact same room name and different display names.
4. Click **Join live call** in each session and allow microphone access.
5. Wait for **Live audio connected**. Speak in each direction and confirm both people can hear the other. Use headphones to reduce echo.
6. Test mute/unmute and end call. Capture the demo video only after the audio is genuinely audible.

Joining a room is not proof that audio works. Verify actual two-way sound. A public STUN server is configured; some networks require a TURN relay, which must be configured separately and may cost money.

## Configure the AI voice assistant

1. Copy `.env.example` to `.env` in the project root.
2. Replace `your_openrouter_api_key_here` with your own key. Optionally choose an OpenRouter model available to your account.
3. Restart the backend.
4. In **Live calling → AI voice assistant**, start a session, click **Start listening**, speak a question, and wait for the AI reply to be spoken.

Example `.env` settings:

```dotenv
OPENROUTER_API_KEY=your_real_key_here
OPENROUTER_MODEL=openrouter/auto
PORT=8787
CLIENT_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
```

Never commit `.env`, put the key in a `VITE_` variable, or expose it in frontend code. The key belongs only on the backend. Speech recognition availability and OpenRouter model availability/quotas can vary.

## Configuration for another frontend URL

If the frontend and backend are not on the same local machine, deploy the backend where both browsers can reach it. Set `VITE_SIGNALING_URL` to the backend's HTTPS origin at frontend build time, and set `CLIENT_ORIGIN` to the exact frontend origin(s) in the backend environment. Use HTTPS/WSS in deployment and configure a TURN server for networks that cannot establish a direct WebRTC connection.

## Checks

Run these from the project root after installing dependencies:

```bash
npm test
npm run build
```

The source ZIP does not include `node_modules`; install dependencies first. A successful build or unit test run does not replace the two-browser real-audio test above.

## AI tools used

- OpenAI ChatGPT — implementation assistance, debugging, and documentation.
