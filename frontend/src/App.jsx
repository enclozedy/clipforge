import { useState, useEffect, useRef } from 'react'
import HomeView from './components/HomeView'
import JobView from './components/JobView'
import { getJSON } from './utils/api'

export default function App() {
  const [view, setView] = useState('home')
  const [jobId, setJobId] = useState(null)
  const [job, setJob] = useState(null)
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    if (view === 'home') loadJobs()
  }, [view])

  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(() => fetchJob(jobId), 1500)
    return () => clearInterval(interval)
  }, [jobId, job?.status])

  async function loadJobs() {
    try { setJobs(await getJSON('/api/jobs')) } catch {}
  }

  async function fetchJob(id) {
    try {
      const data = await getJSON(`/api/jobs/${id}`)
      setJob(data)
      if (data.status === 'completed' || data.status === 'error') {
        clearInterval(interval)
      }
    } catch {}
  }

  function openJob(id) {
    setJobId(id)
    setView('job')
    fetchJob(id)
  }

  function goHome() {
    setView('home')
    setJobId(null)
    setJob(null)
    loadJobs()
  }

  if (view === 'job' && jobId) {
    return <JobView jobId={jobId} job={job} onBack={goHome} onRefresh={() => fetchJob(jobId)} />
  }

  return <HomeView onOpenJob={openJob} jobs={jobs} onRefresh={loadJobs} />
}
