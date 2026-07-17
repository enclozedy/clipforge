import { useState } from 'react'
import { postJSON, formatTime, formatDuration } from '../utils/api'

export default function JobView({ jobId, job, onBack, onRefresh }) {
  const [selected, setSelected] = useState(0)
  const [tweet, setTweet] = useState('')
  const [genTweet, setGenTweet] = useState(false)

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray2 border-t-ink rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray4 text-sm mono">Loading {jobId}…</p>
        </div>
      </div>
    )
  }

  const inProgress = !['completed', 'error'].includes(job.status)
  const clips = job.clips || []
  const candidates = job.candidates || []
  const clip = clips[selected]
  const candidate = candidates[selected]

  async function generateTweet() {
    setGenTweet(true)
    try {
      const res = await postJSON('/api/generate-tweet', {
        text: candidate?.text || '',
        speaker: job.video_info?.channel || '',
        style: 'hook',
      })
      setTweet(res.tweet)
    } catch {}
    setGenTweet(false)
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ─── Nav ─── */}
      <nav className="border-b border-gray1 sticky top-0 z-50 bg-paper/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray4 hover:text-ink transition text-sm">
            <span>←</span>
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-ink flex items-center justify-center">
              <span className="text-paper text-[8px] font-bold mono">CF</span>
            </div>
            <span className="text-sm font-medium">ClipForge</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* ─── Video Info ─── */}
        {job.video_info && (
          <div className="mb-12 rise">
            <p className="text-gray4 text-xs mono tracking-widest uppercase mb-3">
              {job.video_info.channel}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tightest leading-tight mb-4">
              {job.video_info.title}
            </h1>
            <div className="flex items-center gap-4 text-gray3 text-xs">
              <span className="mono">{formatDuration(job.video_info.duration)}</span>
              <span>·</span>
              <span className="mono">{job.video_info.width}×{job.video_info.height}</span>
              <span>·</span>
              <span className="mono">{job.id}</span>
            </div>
          </div>
        )}

        {/* ─── Progress ─── */}
        {inProgress && (
          <div className="mb-12 border border-gray1 p-10 bg-white rise">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-4 h-4 border-2 border-gray2 border-t-ink rounded-full animate-spin" />
              <span className="font-medium text-sm capitalize">{job.status}</span>
            </div>
            <div className="space-y-1">
              {job.progress?.map((msg, i) => (
                <div key={i} className="flex items-baseline gap-3 text-sm text-gray4">
                  <span className="text-gray3 mono text-[10px]">{String(i + 1).padStart(2, '0')}</span>
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Error ─── */}
        {job.status === 'error' && (
          <div className="mb-12 border border-red-200 bg-red-50 p-10">
            <div className="flex items-center gap-2 text-red-700 mb-3">
              <span className="font-medium text-sm">Error</span>
            </div>
            <pre className="text-red-600 text-xs whitespace-pre-wrap mono">{job.error}</pre>
          </div>
        )}

        {/* ─── Clips ─── */}
        {clips.length > 0 && (
          <div className="space-y-12 fade-in">
            {/* Selected clip + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-gray1 border border-gray1">
              {/* Video player */}
              <div className="lg:col-span-3 bg-black">
                <video
                  src={clip?.url}
                  controls
                  className="w-full aspect-video"
                  key={selected}
                />
              </div>

              {/* Info panel */}
              <div className="lg:col-span-2 bg-paper p-8 flex flex-col">
                {/* Clip meta */}
                <div className="mb-8">
                  <p className="text-gray3 text-xs mono tracking-widest uppercase mb-2">
                    Clip {selected + 1} of {clips.length}
                  </p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-2xl font-semibold tracking-tight">{formatDuration(clip?.duration || 0)}</span>
                    <span className="text-gray3 text-sm mono">{clip?.size_mb || 0} MB</span>
                  </div>
                </div>

                {/* Score bar */}
                {candidate && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray4 mono">AI SCORE</span>
                      <span className="text-sm font-bold mono">{candidate.score}</span>
                    </div>
                    <div className="h-px bg-gray1 overflow-hidden">
                      <div
                        className="h-full bg-ink"
                        style={{ width: `${Math.min(100, candidate.score * 5)}%` }}
                      />
                    </div>
                    <p className="text-gray4 text-xs italic mt-3 leading-relaxed">
                      "{candidate.headline}"
                    </p>
                  </div>
                )}

                <div className="border-t border-gray1 pt-6 flex-1">
                  {/* Tweet */}
                  <p className="text-xs text-gray4 mono tracking-widest uppercase mb-4">Tweet</p>
                  {tweet ? (
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed">{tweet}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(tweet)}
                          className="bg-ink text-paper px-4 py-2 text-xs font-medium hover:bg-gray5 transition"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => setTweet('')}
                          className="text-gray4 hover:text-ink px-3 py-2 text-xs transition"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateTweet}
                      disabled={genTweet}
                      className="border border-ink px-4 py-2 text-xs font-medium hover:bg-ink hover:text-paper transition disabled:opacity-50"
                    >
                      {genTweet ? 'Generating…' : 'Generate tweet'}
                    </button>
                  )}
                </div>

                {/* Download */}
                <div className="border-t border-gray1 pt-6 mt-6">
                  <a
                    href={clip?.url}
                    download
                    className="flex items-center justify-between text-sm hover:text-gray4 transition group"
                  >
                    <span>Download clip</span>
                    <span className="mono text-xs text-gray3 group-hover:text-ink transition">↓</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Clip grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray4 text-xs mono tracking-widest uppercase">All clips</p>
                <span className="text-gray3 text-xs mono">{clips.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray1 border border-gray1">
                {clips.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(i); setTweet('') }}
                    className={`group relative aspect-video bg-paper flex items-center justify-center transition hover:bg-gray1/30 ${
                      selected === i ? 'bg-gray1/50' : ''
                    }`}
                  >
                    <span className={`mono text-xs ${selected === i ? 'text-ink font-medium' : 'text-gray3'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {candidates[i] && (
                      <span className="absolute bottom-2 right-2 mono text-[9px] text-gray3">
                        {candidates[i].score}
                      </span>
                    )}
                    {selected === i && (
                      <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-ink" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript */}
            {candidate && (
              <div className="border-t border-gray1 pt-8">
                <p className="text-gray4 text-xs mono tracking-widest uppercase mb-4">
                  Transcript · clip {selected + 1}
                </p>
                <p className="text-gray5 text-sm leading-relaxed max-w-2xl">
                  {candidate.text}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
