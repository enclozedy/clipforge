import { Scissors, Youtube, Sparkles, Film, Clock, TrendingUp, Trash2, Play } from 'lucide-react'
import { formatDuration } from '../utils/api'

export default function HomeView({ url, setUrl, handleSubmit, jobs, onOpen, onDelete }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0a20] to-[#1a0a2e]">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-10 bg-[#0a0a1a]/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ClipForge</h1>
              <p className="text-xs text-white/40">AI Video Clip Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-300 font-medium">Online</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span className="text-xs font-medium text-brand-300">Powered by Whisper AI</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Turn long videos into
            <span className="bg-gradient-to-r from-brand-400 via-pink-400 to-orange-400 bg-clip-text text-transparent"> viral clips</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Paste a YouTube link → AI finds the best moments → You get ready-to-post clips with subtitles.
          </p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-12">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-pink-500 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition" />
            <div className="relative flex items-center gap-3 bg-[#111130] rounded-2xl border border-white/10 p-2">
              <div className="pl-3">
                <Youtube className="w-5 h-5 text-red-400" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-transparent outline-none text-white placeholder-white/30 py-3 text-lg"
                autoFocus
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 disabled:opacity-30 disabled:cursor-not-allowed transition font-semibold text-white flex items-center gap-2"
              >
                <Scissors className="w-4 h-4" />
                Forge Clips
              </button>
            </div>
          </div>
        </form>

        {/* Features strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Sparkles, title: 'AI Scoring', desc: 'Whisper transcription + keyword analysis finds viral moments' },
            { icon: Film, title: 'Auto Subtitles', desc: 'Every clip gets burned-in .srt subtitles automatically' },
            { icon: TrendingUp, title: 'Tweet Ready', desc: 'Generates hook-driven tweet text for each clip' },
          ].map((f, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-brand-300" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-white/40">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Recent jobs */}
        {jobs.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              Recent Jobs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] cursor-pointer transition"
                  onClick={() => onOpen(j.id)}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-brand-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{j.video_info?.title || j.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={j.status} />
                      {j.video_info?.duration > 0 && (
                        <span className="text-xs text-white/30">{formatDuration(j.video_info.duration)}</span>
                      )}
                      <span className="text-xs text-white/30">{j.clips?.length || 0} clips</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(j.id) }}
                    className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    completed: 'bg-green-500/10 text-green-300 border-green-500/20',
    error: 'bg-red-500/10 text-red-300 border-red-500/20',
    downloading: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    transcribing: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    scoring: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    rendering: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    queued: 'bg-white/5 text-white/40 border-white/10',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] || colors.queued}`}>
      {status}
    </span>
  )
}
