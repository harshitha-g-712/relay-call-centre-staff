import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Phone, PhoneOff, Mic, MicOff, Bot, Users, Radio, Copy, CheckCircle2, AlertTriangle } from 'lucide-react'

const serverUrl = (import.meta as any).env.VITE_SIGNALING_URL || 'http://localhost:8787'
type CallMode = 'human' | 'ai'

export default function CallLab() {
  const [mode, setMode] = useState<CallMode>('human')
  const [room, setRoom] = useState('relay-demo-room')
  const [name, setName] = useState('Alex')
  const [status, setStatus] = useState('Not connected')
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [messages, setMessages] = useState<{ who: string; text: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  useEffect(() => () => { cleanup() }, [])
  const cleanup = () => {
    recognitionRef.current?.stop?.(); recognitionRef.current = null
    pcRef.current?.close(); pcRef.current = null
    pendingCandidatesRef.current = []
    localRef.current?.getTracks().forEach(t => t.stop()); localRef.current = null
    socketRef.current?.disconnect(); socketRef.current = null
    setConnected(false); setMuted(false); setBusy(false)
  }
  const connectHuman = async () => {
    try {
      setBusy(true); setStatus('Requesting microphone…')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localRef.current = stream
      const socket = io(serverUrl, { transports: ['websocket', 'polling'] }); socketRef.current = socket
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); pcRef.current = pc
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      pc.ontrack = event => { if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = event.streams[0]; void remoteAudioRef.current.play() } }
      pc.onicecandidate = event => { if (event.candidate) socket.emit('signal', { room, data: { candidate: event.candidate } }) }
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') { setConnected(true); setStatus('Live audio connected') } if (['failed','disconnected','closed'].includes(pc.connectionState)) { setConnected(false); setStatus(`Call ${pc.connectionState}`) } }
      socket.on('connect', () => { socket.emit('join-room', { room, name }); setStatus('Joined room; waiting for another person…') })
      socket.on('peer-joined', async () => { if (!pcRef.current) return; const offer = await pcRef.current.createOffer(); await pcRef.current.setLocalDescription(offer); socket.emit('signal', { room, data: { description: pcRef.current.localDescription } }); setStatus('Calling peer…') })
      socket.on('signal', async ({ data }: any) => {
        const current = pcRef.current
        if (!current || !data) return
        try {
          if (data.description) {
            await current.setRemoteDescription(data.description)
            for (const candidate of pendingCandidatesRef.current.splice(0)) await current.addIceCandidate(candidate)
            if (data.description.type === 'offer') {
              const answer = await current.createAnswer()
              await current.setLocalDescription(answer)
              socket.emit('signal', { room, data: { description: current.localDescription } })
            }
          } else if (data.candidate) {
            if (current.remoteDescription) await current.addIceCandidate(data.candidate)
            else pendingCandidatesRef.current.push(data.candidate)
          }
        } catch (e) { console.warn('WebRTC signaling error:', e); setStatus('Could not negotiate audio connection. Try leaving and rejoining the room.') }
      })
      socket.on('peer-left', () => setStatus('The other participant left the room'))
      socket.on('room-full', () => { cleanup(); setStatus('This room already has two participants. Choose another room.') })
      socket.on('connect_error', () => { cleanup(); setStatus('Could not reach signaling server. Start the backend first, then rejoin.') })
      setBusy(false)
    } catch (e: any) { setBusy(false); setStatus(e?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : `Could not start call: ${e?.message || 'unknown error'}`); cleanup() }
  }
  const startAI = async () => {
    setMessages([]); setStatus('AI voice session ready. Press Start listening to speak.'); setConnected(true)
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { setStatus('Speech recognition is not supported in this browser. Use current Chrome or Edge.'); setConnected(false); return }
    try { await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())) } catch { setStatus('Allow microphone access to use the AI voice assistant.'); setConnected(false) }
  }
  const listen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setStatus('Use Chrome or Edge for browser speech recognition.'); return }
    const recognition = new SpeechRecognition(); recognition.lang = 'en-US'; recognition.interimResults = false; recognition.continuous = false; recognitionRef.current = recognition
    recognition.onstart = () => setStatus('Listening… speak now')
    recognition.onerror = (event: any) => setStatus(`Speech recognition error: ${event.error}`)
    recognition.onresult = async (event: any) => { const text = event.results[0][0].transcript; setMessages(prev => [...prev, { who: 'You', text }]); setBusy(true); setStatus('Getting a live AI response…'); try { const response = await fetch(`${serverUrl}/api/ai/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, history: messages.slice(-8) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'AI endpoint unavailable'); const answer = data.reply as string; setMessages(prev => [...prev, { who: 'AI assistant', text: answer }]); const utterance = new SpeechSynthesisUtterance(answer); utterance.onend = () => setStatus('Ready — start listening for your next turn.'); speechSynthesis.cancel(); speechSynthesis.speak(utterance); setStatus('Speaking AI response…') } catch (e: any) { setStatus(e.message || 'AI response failed. Check backend and OPENROUTER_API_KEY.'); setMessages(prev => [...prev, { who: 'System', text: 'AI response unavailable. Configure OPENROUTER_API_KEY in the backend .env file.' }]) } finally { setBusy(false) } }
    recognition.start()
  }
  const leave = () => { cleanup(); setStatus('Call ended'); setMessages(prev => prev.length ? [...prev, { who: 'System', text: 'Session ended.' }] : prev) }
  const copyRoom = async () => { try { await navigator.clipboard.writeText(room); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { setStatus(`Share room name: ${room}`) } }

  return <div className="call-lab">
    <div className="call-lab-intro"><div className="call-lab-icon"><Radio size={23}/></div><div><h2>Live calling lab</h2><p>Real browser microphone audio and live AI responses. No simulated call timer or fake transcript.</p></div></div>
    <div className="call-mode-tabs"><button className={mode === 'human' ? 'selected' : ''} onClick={() => { if (connected) leave(); setMode('human'); setStatus('Not connected') }}><Users size={16}/> Human to human</button><button className={mode === 'ai' ? 'selected' : ''} onClick={() => { if (connected) leave(); setMode('ai'); setStatus('Not connected') }}><Bot size={16}/> AI voice assistant</button></div>
    {mode === 'human' ? <div className="call-lab-card"><div className="call-lab-card-heading"><div><h3>Browser-to-browser audio call</h3><p>Open this page in two browser tabs or on two devices. Use the same room name.</p></div><span className={`live-pill ${connected ? 'is-live' : ''}`}><i/>{connected ? 'LIVE' : 'NOT IN CALL'}</span></div><div className="call-form-grid"><label>Your display name<input value={name} onChange={e => setName(e.target.value)} disabled={busy || connected}/></label><label>Shared room name<input value={room} onChange={e => setRoom(e.target.value.trim().replace(/\s+/g, '-'))} disabled={busy || connected}/></label></div><button className="room-copy" onClick={copyRoom}>{copied ? <CheckCircle2 size={15}/> : <Copy size={15}/>} {copied ? 'Room copied' : 'Copy room name'}</button><div className="call-status"><span className={connected ? 'status-pulse' : ''}/><div><b>{status}</b><small>Signaling server: {serverUrl}</small></div></div><div className="call-lab-actions">{!connected ? <button className="primary-button" disabled={busy || !name.trim() || !room.trim()} onClick={connectHuman}><Phone size={16}/> {busy ? 'Connecting…' : 'Join live call'}</button> : <><button className="secondary-control" onClick={() => { const track = localRef.current?.getAudioTracks()[0]; if (track) { track.enabled = muted; setMuted(!muted) } }}>{muted ? <MicOff size={16}/> : <Mic size={16}/>} {muted ? 'Unmute' : 'Mute microphone'}</button><button className="danger-call-button" onClick={leave}><PhoneOff size={16}/> End call</button></>}</div><audio ref={remoteAudioRef} autoPlay playsInline/><div className="call-lab-note"><AlertTriangle size={15}/><span>Requires microphone permission and a running signaling server. STUN is configured; some restrictive networks may need a TURN relay for connectivity.</span></div></div> : <div className="call-lab-card"><div className="call-lab-card-heading"><div><h3>Live AI voice conversation</h3><p>Speak aloud; browser speech recognition transcribes your words, the backend calls OpenRouter, and the answer is spoken aloud.</p></div><span className={`live-pill ${connected ? 'is-live' : ''}`}><i/>{connected ? 'SESSION READY' : 'NOT STARTED'}</span></div><div className="call-lab-actions">{!connected ? <button className="primary-button" onClick={startAI}><Bot size={16}/> Start AI voice session</button> : <><button className="primary-button" disabled={busy} onClick={listen}><Mic size={16}/> {busy ? 'Thinking…' : 'Start listening'}</button><button className="danger-call-button" onClick={leave}><PhoneOff size={16}/> End session</button></>}</div><div className="call-status"><span className={connected ? 'status-pulse' : ''}/><div><b>{status}</b><small>Browser speech recognition and speech synthesis; live AI needs a configured backend API key.</small></div></div><div className="voice-transcript"><div className="voice-transcript-head"><b>Conversation transcript</b><span>{messages.length} messages</span></div>{messages.length ? messages.map((m, i) => <div className={`voice-message ${m.who === 'You' ? 'from-user' : ''}`} key={`${m.who}-${i}`}><b>{m.who}</b><p>{m.text}</p></div>) : <div className="voice-empty">Your real conversation will appear here after you start speaking.</div>}</div><div className="call-lab-note"><AlertTriangle size={15}/><span>AI voice needs OPENROUTER_API_KEY in the backend environment. Browser speech APIs vary by browser and may send audio to the browser vendor for recognition.</span></div></div>}
    <div className="call-lab-disclaimer"><b>Scope:</b> This delivers real browser-to-browser audio and an AI voice session in the web app. It does not dial ordinary mobile/landline numbers. For phone-number calling, a telephony provider and usually paid credits are required.</div>
  </div>
}
