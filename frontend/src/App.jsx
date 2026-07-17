import { useState, useEffect, useRef } from 'react'
import { Scissors, Youtube, Sparkles, Film, Twitter, Download, Trash2, Loader2, CheckCircle2, AlertCircle, Wand2, Play, Clock, TrendingUp } from 'lucide-react'
import { postJSON, getJSON, deleteJSON, connectWS, formatTime, formatDuration } from './utils/api'

export default function App() {
  const [view, setView] = useState('home') // home, job
  const [url, setUrl] = useState('')
  const [jobId, setJobId] = useState(null)
  const [job, setJob] = useState(null)
  const [wsMessages, setWsMessages] = useState([])
  const [jobs, setJobs] = useState([])
  const wsRef = useRef(null)

  // Load jobs list
  useEffect(() => {
    if (view === 'home') loadJobs()
  }, [view])

  // WebSocket
  useEffect(() => {
    if (!jobId) return
    setWsMessages([])
    wsRef.current = connectWS(jobId, (msg) => {
      setWsMessages((prev) => [...prev, msg])
      if (msg.done || msg.status === 'completed' || msg.status === 'error') {
        fetchJob(jobId)
      }
    })
    return () => wsRef.current?.close()
  }, [jobId])

  // Poll job while in progress
  useEffect(() => {
    if (!jobId || !job) return
    if (job.status === 'completed' || job.status === 'error') return
    const interval = setInterval(() => fetchJob(jobId), 2000)
    return () => clearInterval(interval)
  }, [jobId, job?.status])

  async function loadJobs() {
    try { setJobs(await getJSON('/api/jobs')) } catch {}
  }

  async function fetchJob(id) {
    try {
      const data = await getJSON(`/api/jobs/${id}`)
      setJob(data)
    } catch (e) { console.error(e) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    try {
      const data = await postJSON('/api/jobs', {
        url: url.trim(),
        clip_count: 5,
        min_duration: 30,
        max_duration: 60,
        auto_render: true,
      })
      setJobId(data.job_id)
      setView('job')
      fetchJob(data.job_id)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete job and all clips?')) return
    await deleteJSON(`/api/jobs/${id}`)
    if (jobId === id) {
      setJobId(null)
      setJob(null)
      setView('home')
    }
    loadJobs()
  }

  if (view === 'job' && jobId) {
    return <JobView
      jobId={jobId} job={job} wsMessages={wsMessages}
      onBack={() => { setView('home'); setJobId(null); setJob(null) }}
      onDelete={() => handleDelete(jobId)}
    />
  }

  return <HomeView url={url} setUrl={setUrl} handleSubmit={handleSubmit} jobs={jobs} onOpen={(id) => { setJobId(id); setView('job'); fetchJob(id) }} onDelete={handleDelete} />
}
