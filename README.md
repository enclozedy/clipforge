# ClipForge — AI Video Clip Studio

> Paste a YouTube link → AI finds the best moments → You get ready-to-post clips with subtitles.

## Features

- **AI-Powered Clip Discovery** — Whisper transcription + keyword scoring finds viral moments automatically
- **Auto Subtitles** — Every clip gets burned-in .srt subtitles
- **Tweet Generator** — Hook-driven tweet text for each clip
- **Beautiful Dashboard** — React + Tailwind UI with live progress
- **One-Click Export** — Download clips in 1080p with burned subtitles
- **Docker Ready** — Full docker-compose setup

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/enclozedy/clipforge.git
cd clipforge
docker-compose up -d
```

Open `http://localhost:8080`

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Make sure ffmpeg is installed
uvicorn main:app --host 0.0.0.0 --port 8100
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5174`

## How It Works

1. **Download** — yt-dlp fetches the video in 1080p
2. **Transcribe** — OpenAI Whisper creates word-level timestamped transcript
3. **Score** — Custom scoring engine analyzes hooks, numbers, emotional markers, and authority signals
4. **Cut** — ffmpeg extracts the top moments with optimal boundaries
5. **Subtitle** — .srt subtitles burned into each clip
6. **Generate** — Tweet text crafted from clip content

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/jobs` | POST | Create clip extraction job |
| `/api/jobs` | GET | List all jobs |
| `/api/jobs/{id}` | GET | Get job status & clips |
| `/api/jobs/{id}` | DELETE | Delete job & clips |
| `/api/clips/render` | POST | Render custom clip with offsets |
| `/api/generate-tweet` | POST | Generate tweet from text |
| `/ws/{job_id}` | WS | Live progress stream |

## Tech Stack

- **Backend:** FastAPI, Whisper, yt-dlp, ffmpeg
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Docker:** Full compose setup

## Configuration

Environment variables (`.env` in backend/):

```
CLIPFORGE_WHISPER_MODEL=base  # tiny, base, small, medium, large
CLIPFORGE_FFMPEG_PATH=/usr/bin/ffmpeg
CLIPFORGE_PORT=8100
```

## License

MIT

---

Made by [@enclozedy](https://github.com/enclozedy)
