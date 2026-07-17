import { useState } from 'react'
import { postJSON, deleteJSON, formatDuration } from '../utils/api'

export default function HomeView({ onOpenJob, jobs, onRefresh }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await postJSON('/api/jobs', {
        url: url.trim(),
        clip_count: 5,
        min_duration: 30,
        max_duration: 60,
        auto_render: true,
      })
      onOpenJob(data.job_id)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete job and all clips?')) return
    await deleteJSON(`/api/jobs/${id}`)
    onRefresh()
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ─── Nav ─── */}
      <nav className="border-b border-gray1 sticky top-0 z-50 bg-paper/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink flex items-center justify-center">
              <span className="text-paper text-[10px] font-bold mono">CF</span>
            </div>
            <span className="font-semibold tracking-tight text-sm">ClipForge</span>
            <span className="text-gray3 text-xs ml-1">v1.0</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/enclozedy/clipforge" target="_blank" className="text-gray4 hover:text-ink transition text-xs">GitHub</a>
            <a href="#" className="text-gray4 hover:text-ink transition text-xs">Docs</a>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-gray4 text-xs mono">online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-5xl mx-auto px-8 pt-32 pb-20">
        <div className="max-w-2xl">
          <p className="text-gray4 text-xs mono tracking-widest uppercase mb-8 rise">
            AI · VIDEO · 2026
          </p>
          <h1 className="text-6xl md:text-7xl font-semibold tracking-tightest leading-[0.95] mb-8 rise-1">
            Turn long videos
            <br />
            into <span className="serif font-normal">viral clips.</span>
          </h1>
          <p className="text-lg text-gray5 leading-relaxed max-w-lg mb-12 rise-2">
            Paste a YouTube link. AI finds the best moments, cuts them with subtitles,
            and generates tweet-ready text. Automatically.
          </p>

          {/* URL Input */}
          <form onSubmit={handleSubmit} className="rise-3">
            <div className="flex items-center border-b border-ink pb-3 mb-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-transparent outline-none text-lg placeholder-gray3"
                autoFocus
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="bg-ink text-paper px-6 py-2.5 text-sm font-medium hover:bg-gray5 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Processing…' : 'Forge Clips'}
              </button>
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <p className="text-gray3 text-xs mt-2">
              No signup required · Powered by Whisper AI · 1080p output
            </p>
          </form>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray1" />

      {/* ─── How It Works ─── */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <p className="text-gray4 text-xs mono tracking-widest uppercase mb-12">
          How it works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray1">
          {[
            { num: '01', title: 'Paste', desc: 'Drop any YouTube URL. We download it in 1080p.' },
            { num: '02', title: 'Analyze', desc: 'Whisper transcribes. Scoring engine finds viral moments.' },
            { num: '03', title: 'Export', desc: 'Get clips with burned subtitles and tweet text.' },
          ].map((step, i) => (
            <div key={i} className="bg-paper p-10">
              <span className="mono text-xs text-gray3 block mb-6">{step.num}</span>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">{step.title}</h3>
              <p className="text-gray4 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray1" />

      {/* ─── Features ─── */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-gray4 text-xs mono tracking-widest uppercase mb-12">
              Features
            </p>
            <h2 className="text-4xl font-semibold tracking-tightest leading-tight mb-6">
              Built for <span className="serif font-normal">creators.</span>
            </h2>
            <p className="text-gray5 leading-relaxed">
              Every clip is scored, subtitled, and ready to post. No manual editing.
              No guessing which moment will land.
            </p>
          </div>
          <div className="space-y-px bg-gray1">
            {[
              { t: 'AI Scoring', d: 'Keyword density, emotional markers, authority signals' },
              { t: 'Auto Subtitles', d: 'Word-level .srt burned into every clip' },
              { t: 'Tweet Generator', d: 'Hook-driven text crafted from clip content' },
              { t: 'Live Progress', d: 'WebSocket streaming — watch every step' },
              { t: 'Open Source', d: 'MIT license · Self-host with Docker' },
            ].map((f, i) => (
              <div key={i} className="bg-paper px-6 py-5 flex items-start justify-between gap-8">
                <div>
                  <h4 className="font-medium text-sm mb-1">{f.t}</h4>
                  <p className="text-gray4 text-xs">{f.d}</p>
                </div>
                <span className="text-gray3 mono text-xs">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray1" />

      {/* ─── Recent Jobs ─── */}
      {jobs.length > 0 && (
        <section className="max-w-5xl mx-auto px-8 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-gray4 text-xs mono tracking-widest uppercase mb-4">History</p>
              <h2 className="text-3xl font-semibold tracking-tightest">Recent jobs</h2>
            </div>
            <span className="text-gray3 text-xs mono">{jobs.length} total</span>
          </div>
          <div className="border-t border-gray1">
            {jobs.map((j) => (
              <div
                key={j.id}
                onClick={() => onOpenJob(j.id)}
                className="group border-b border-gray1 py-5 flex items-center justify-between cursor-pointer hover:bg-gray1/30 transition -mx-4 px-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {j.video_info?.title || j.url}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <StatusDot status={j.status} />
                    <span className="text-gray3 text-xs mono">{j.id}</span>
                    {j.video_info?.duration > 0 && (
                      <span className="text-gray3 text-xs">{formatDuration(j.video_info.duration)}</span>
                    )}
                    <span className="text-gray3 text-xs">{j.clips?.length || 0} clips</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray3 group-hover:text-ink transition">→</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(j.id) }}
                    className="text-gray3 hover:text-red-600 transition text-xs opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Divider ─── */}
      <div className="border-t border-gray1" />

      {/* ─── Footer ─── */}
      <footer className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink flex items-center justify-center">
              <span className="text-paper text-[9px] font-bold mono">CF</span>
            </div>
            <div>
              <p className="text-xs font-medium">ClipForge</p>
              <p className="text-gray3 text-[10px] mono">MIT License · Open Source</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray4">
            <a href="https://github.com/enclozedy/clipforge" target="_blank" className="hover:text-ink transition">GitHub</a>
            <span className="text-gray3">·</span>
            <span className="serif">Built by @enclozeddd</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    completed: 'bg-green-500',
    error: 'bg-red-500',
    downloading: 'bg-blue-400 animate-pulse',
    transcribing: 'bg-yellow-500 animate-pulse',
    scoring: 'bg-purple-500 animate-pulse',
    rendering: 'bg-orange-500 animate-pulse',
    queued: 'bg-gray3',
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || colors.queued}`} />
      <span className="text-gray4 text-xs">{status}</span>
    </span>
  )
}
