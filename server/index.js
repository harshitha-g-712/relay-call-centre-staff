import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'node:http'
import { Server } from 'socket.io'

const app = express()
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean)
const corsOptions = { origin: allowedOrigins?.length ? allowedOrigins : true }
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
const server = http.createServer(app)
const io = new Server(server, { cors: { ...corsOptions, methods: ['GET', 'POST'] } })
const PORT = Number(process.env.PORT || 8787)

app.get('/health', (_req, res) => res.json({ ok: true, service: 'relay-calling-backend' }))
app.post('/api/ai/reply', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 4000) : ''
  if (!text) return res.status(400).json({ error: 'Message text is required.' })
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured in the backend .env file.' })
  try {
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).filter(m => typeof m?.text === 'string').map(m => ({ role: m.who === 'You' ? 'user' : 'assistant', content: m.text.slice(0, 2000) })) : []
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173', 'X-Title': 'Relay Call Centre AI Voice Assistant' },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'openrouter/auto', messages: [{ role: 'system', content: 'You are a concise, friendly customer support voice assistant. Speak naturally. Keep answers short and ask one clear follow-up question when needed. Never claim to have completed account actions you cannot perform.' }, ...history, { role: 'user', content: text }], max_tokens: 220 })
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'The AI provider returned an error.' })
    const reply = data?.choices?.[0]?.message?.content
    if (typeof reply !== 'string' || !reply.trim()) return res.status(502).json({ error: 'The AI provider returned an empty response.' })
    res.json({ reply: reply.trim() })
  } catch (error) { console.error('AI reply failed:', error); res.status(502).json({ error: 'Could not reach the AI provider. Check network and API configuration.' }) }
})

io.on('connection', socket => {
  socket.on('join-room', ({ room, name } = {}) => {
    if (typeof room !== 'string' || !room.trim() || room.length > 80) return
    const roomName = room.trim()
    const peers = io.sockets.adapter.rooms.get(roomName)
    if (peers && peers.size >= 2) { socket.emit('room-full'); return }
    socket.data.room = roomName; socket.data.name = typeof name === 'string' ? name.slice(0, 40) : 'Agent'
    socket.join(roomName)
    socket.to(roomName).emit('peer-joined', { name: socket.data.name })
  })
  socket.on('signal', ({ room, data } = {}) => {
    if (!room || room !== socket.data.room || !data || typeof data !== 'object') return
    socket.to(room).emit('signal', { data })
  })
  socket.on('disconnect', () => { if (socket.data.room) socket.to(socket.data.room).emit('peer-left', { name: socket.data.name }) })
})

server.listen(PORT, () => console.log(`Relay calling backend listening on http://localhost:${PORT}`))
