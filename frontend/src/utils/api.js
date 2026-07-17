const API = import.meta.env.VITE_API || ''

export async function postJSON(url, data) {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
  return res.json()
}

export async function getJSON(url) {
  const res = await fetch(`${API}${url}`)
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
  return res.json()
}

export async function deleteJSON(url) {
  const res = await fetch(`${API}${url}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
  return res.json()
}

export function connectWS(jobId, onMessage, onClose) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws/${jobId}`)
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch { onMessage({ message: e.data }) }
  }
  ws.onclose = onClose
  return ws
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
