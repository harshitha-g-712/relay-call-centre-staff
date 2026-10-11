# Relay — Call Centre Staff App

A responsive React + TypeScript call-centre workspace, extended with a live calling lab.

## What's real in this version

- **Human-to-human browser audio:** WebRTC microphone audio between two browser sessions, with Socket.IO signaling. This is real audio, not a simulated call timer or scripted transcript.
- **AI voice assistant:** browser speech recognition captures a spoken question, the backend requests a live response from OpenRouter, and browser speech synthesis reads the response aloud. Requires an OpenRouter API key.
- Existing queue, customer, messages, knowledge base, performance, schedule, and settings screens remain as a frontend demonstration with sample workspace data.

## Requirements

- Node.js 18+ (20+ recommended)
- Chrome or Edge recommended for the browser speech-recognition APIs
- Microphone access; use `localhost` for local development or HTTPS in deployment
- Optional OpenRouter account/API key for AI voice responses

## Install and run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the signaling/API backend in terminal 1:

   ```bash
   npm run server
   ```

   Backend health check: http://localhost:8787/health

3. Start the frontend in terminal 2:

   ```bash
   npm run dev
   ```

4. Open the Vite URL (usually http://localhost:5173), choose **Live calling** in the sidebar, and select **Human to human**.
5. Open the same app in a second browser tab or on a second device. Join the exact same room name from both clients and allow microphone access. Speak to verify actual two-way audio. Use headphones to avoid feedback.

## Enable the AI voice assistant (optional)

1. Copy `.env.example` to `.env`.
2. Add your real key to `OPENROUTER_API_KEY` and optionally set `OPENROUTER_MODEL` to a model available to your account.
3. Restart `npm run server`.
4. In **Live calling → AI voice assistant**, start the session and press **Start listening** for each turn. The app transcribes speech in the browser, gets a live AI answer from the backend, and speaks the answer aloud.

Never place secrets in frontend variables such as `VITE_OPENROUTER_API_KEY`. The included backend keeps the OpenRouter key server-side. Free model availability, quotas, and browser speech-recognition availability can change.

## Network / deployment notes

- This is **browser-to-browser WebRTC**, not PSTN calling. It does not dial ordinary mobile or landline numbers. That normally requires a telephony provider and often paid credits.
- The backend must be reachable from both browsers. For different devices, deploy the backend publicly with HTTPS/WSS-compatible hosting and set `VITE_SIGNALING_URL` to its HTTPS origin when building the frontend.
- A public STUN server is configured for initial connectivity. Some NATs/firewalls require a TURN relay; reliable TURN services may cost money. A successful room join alone does not prove audio connectivity—verify that the call status becomes **Live audio connected** and that both people hear each other.
- Configure `CLIENT_ORIGIN` to the exact frontend origin(s) before production deployment. Do not use permissive CORS in a public production service.
- The original queue/customer records are still sample data and the old queue's call buttons are not connected to telephone networks. Use the new **Live calling** page for real WebRTC tests.

## Checks

```bash
npm test
npm run build
```

## AI tools used

- OpenAI ChatGPT — implementation planning, code assistance, and documentation.
