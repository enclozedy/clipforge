import { useState } from 'react'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Film, Twitter, Download, Play, Trash2, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { formatTime, formatDuration, postJSON } from '../utils/api'

export default function JobView({ jobId, job, wsMessages, onBack, onDelete }) {
  const [selectedClip, setSelectedClip] = useState(0)
  const [tweet, setTweet] = useState('')
  const [generatingTweet, setGeneratingTweet] = useState(false)

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    )
  }

  const isInProgress = !['completed', 'error'].includes(job.status)
  const clips = job.clips || []
  const candidates = job.candidates || []

  async function generateTweet(text, speaker) {
    setGeneratingTweet(true)
    try {
      const res = await postJSON('/api/generate-tweet', { text, speaker, style: 'hook' })
      setTweet(res.tweet)
    } catch (e) {
      setTweet('Error generating tweet')
    }
    setGeneratingTweet(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0a20] to-[#1a0a2e]">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-10 bg-[#0a0a1a]/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button onClick={onDelete} className="flex items-center gap-2 text-red-400/60 hover:text-red-400 transition text-sm">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Video Info */}
        {job.video_info && (
          <div className="mb-6 animate-slide-up">
            <h1 className="text-2xl font-bold mb-2">{job.video_info.title}</h1>
            <div className="flex items-center gap-4 text-sm text-white/40">
              <span>{job.video_info.channel}</span>
              <span>•</span>
              <span>{formatDuration(job.video_info.duration)}</span>
              <span>•</span>
              <span>{job.video_info.width}×{job.video_info.height}</span>
            </div>
          </div>
        )}

        {/* Progress */}
        {isInProgress && (
          <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span className="font-semibold capitalize">{job.status}...</span>
            </div>
            <div className="space-y-2">
              {wsMessages.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/50 animate-slide-up">
                  {msg.status === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : msg.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  )}
                  {msg.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {job.status === 'error' && (
          <div className="mb-8 p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-300 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Error</span>
            </div>
            <pre className="text-sm text-red-200/60 whitespace-pre-wrap">{job.error}</pre>
          </div>
        )}

        {/* Clips */}
        {clips.length > 0 && (
          <div className="space-y-6">
            {/* Selected clip preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video player */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
                  <video
                    src={clips[selectedClip]?.url}
                    controls
                    className="w-full aspect-video"
                    key={selectedClip}
                  />
                </div>
                {/* Clip info bar */}
                <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(clips[selectedClip]?.duration || 0)}</span>
                    <span>•</span>
                    <span>{clips[selectedClip]?.size_mb || 0} MB</span>
                    <span>•</span>
                    <span>{clips[selectedClip]?.width}×{clips[selectedClip]?.height}</span>
                  </div>
                  <a
                    href={clips[selectedClip]?.url}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>

              {/* Tweet panel */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Twitter className="w-4 h-4 text-brand-300" />
                  <h3 className="font-semibold text-sm">Tweet Text</h3>
                </div>
                {tweet ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed p-3 rounded-lg bg-white/[0.03] border border-white/5">{tweet}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(tweet)}
                        className="flex-1 px-3 py-2 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition text-sm font-medium"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setTweet('')}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateTweet(
                      candidates[selectedClip]?.text || '',
                      job.video_info?.channel || ''
                    )}
                    disabled={generatingTweet}
                    className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-brand-500/20 to-pink-500/20 hover:from-brand-500/30 hover:to-pink-500/30 border border-brand-500/20 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {generatingTweet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate Tweet
                  </button>
                )}
                {/* Score */}
                {candidates[selectedClip] && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">AI Score</span>
                      <span className="text-sm font-bold text-brand-300">
                        {candidates[selectedClip].score}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-pink-400"
                        style={{ width: `${Math.min(100, candidates[selectedClip].score * 5)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/30 italic line-clamp-2">
                      "{candidates[selectedClip].headline}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Clip grid */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-white/40" />
                All Clips ({clips.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {clips.map((clip, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedClip(i); setTweet('') }}
                    className={`group relative aspect-video rounded-xl overflow-hidden border transition ${
                      selectedClip === i
                        ? 'border-brand-400 ring-2 ring-brand-400/30'
                        : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    {clip.thumbnail ? (
                      <img src={clip.thumbnail.replace('/clips/', '/thumbnails/').replace('.mp4', '.jpg')} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-500/10 to-pink-500/10 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-white/70">{formatTime(clip.duration)}</span>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60">
                          <TrendingUp className="w-2.5 h-2.5 text-brand-300" />
                          <span className="text-xs text-brand-300">{candidates[i]?.score || '?'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript */}
            {candidates.length > 0 && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <h3 className="font-semibold mb-3">Selected Clip Transcript</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {candidates[selectedClip]?.text}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
