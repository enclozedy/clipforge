"""
Main FastAPI application — ClipForge API.
"""
import asyncio
import json
import uuid
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from config import settings
from downloader import download_video, extract_video_id, get_video_info
from transcriber import transcribe, Transcript
from scorer import get_top_clips, ClipCandidate
from clipper import cut_clip, generate_srt, generate_waveform, RenderedClip
import httpx

# ─── State ─────────────────────────────────────────────

jobs: dict[str, dict] = {}  # job_id → status/data in memory

# ─── Lifespan ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_dirs()
    yield

app = FastAPI(title="ClipForge API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static for serving clips
app.mount("/clips", StaticFiles(directory=str(settings.clips_dir)), name="clips")
app.mount("/thumbnails", StaticFiles(directory=str(settings.thumbnails_dir)), name="thumbnails")


# ─── Models ────────────────────────────────────────────

class CreateJobRequest(BaseModel):
    url: str
    clip_count: int = Field(default=5, ge=1, le=10)
    min_duration: float = Field(default=30.0, ge=10.0, le=120.0)
    max_duration: float = Field(default=60.0, ge=15.0, le=180.0)
    auto_render: bool = True


class RenderClipRequest(BaseModel):
    job_id: str
    candidate_index: int = Field(ge=0)
    start_offset: float = Field(default=0.0)  # Manual adjust
    end_offset: float = Field(default=0.0)
    burn_subtitles: bool = True


class GenerateTweetRequest(BaseModel):
    text: str
    speaker: str = ""
    style: str = "hook"  # hook, quote, analytical


# ─── Helpers ───────────────────────────────────────────

async def send_progress(websocket: WebSocket, message: str, data: dict = None):
    await websocket.send_text(json.dumps({"message": message, **(data or {})}))


# ─── Routes ────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/jobs")
async def create_job(req: CreateJobRequest, bg: BackgroundTasks):
    """Create a new clip extraction job."""
    video_id = extract_video_id(req.url)
    job_id = str(uuid.uuid4())[:8]

    jobs[job_id] = {
        "id": job_id,
        "url": req.url,
        "video_id": video_id,
        "status": "queued",
        "progress": [],
        "video_info": None,
        "transcript": None,
        "candidates": [],
        "clips": [],
        "settings": req.model_dump(),
    }

    bg.add_task(process_job, job_id, req)
    return {"job_id": job_id, "status": "queued"}


async def process_job(job_id: str, req: CreateJobRequest):
    """Background task: download → transcribe → score → optionally render."""
    job = jobs[job_id]
    try:
        # 1. Download
        job["status"] = "downloading"
        job["progress"].append("Downloading video...")

        loop = asyncio.get_event_loop()
        video_info = await loop.run_in_executor(None, download_video, req.url)

        job["video_info"] = {
            "id": video_info.id,
            "title": video_info.title,
            "channel": video_info.channel,
            "duration": video_info.duration,
            "thumbnail": video_info.thumbnail,
            "width": video_info.width,
            "height": video_info.height,
            "filepath": str(video_info.filepath),
        }
        job["progress"].append(f"Downloaded: {video_info.title}")

        # 2. Transcribe
        job["status"] = "transcribing"
        job["progress"].append("Transcribing with Whisper...")

        transcript = await loop.run_in_executor(
            None, transcribe, video_info.filepath, video_info.id
        )

        # Save transcript
        transcript_path = settings.workspace_dir / f"{video_info.id}_transcript.json"
        transcript.to_json(transcript_path)

        job["transcript_path"] = str(transcript_path)
        job["transcript"] = {
            "video_id": transcript.video_id,
            "language": transcript.language,
            "duration": transcript.duration,
            "segment_count": len(transcript.segments),
        }
        job["progress"].append(f"Transcribed: {len(transcript.segments)} segments")

        # 3. Score & find candidates
        job["status"] = "scoring"
        candidates = get_top_clips(
            transcript,
            count=req.clip_count,
            min_duration=req.min_duration,
            max_duration=req.max_duration,
        )

        job["candidates"] = [
            {
                "index": i,
                "start": c.start,
                "end": c.end,
                "duration": c.end - c.start,
                "score": round(c.score, 2),
                "headline": c.headline,
                "text": c.text[:300],
                "score_breakdown": c.score_breakdown,
            }
            for i, c in enumerate(candidates)
        ]
        job["progress"].append(f"Found {len(candidates)} clip candidates")

        # 4. Auto-render if requested
        if req.auto_render and candidates:
            job["status"] = "rendering"
            loaded_transcript = Transcript.from_json(Path(job["transcript_path"]))

            for i, candidate in enumerate(candidates):
                job["progress"].append(f"Rendering clip {i+1}/{len(candidates)}...")
                clip_path = settings.clips_dir / f"{job['video_id']}_clip_{i}.mp4"
                srt_path = settings.clips_dir / f"{job['video_id']}_clip_{i}.srt"

                # Generate subtitles
                seg_list = [s.__dict__ if hasattr(s, '__dict__') else s for s in loaded_transcript.segments]
                generate_srt(
                    [{"start": s.start, "end": s.end, "text": s.text} for s in loaded_transcript.segments],
                    candidate.start, candidate.end, srt_path
                )

                rendered = await loop.run_in_executor(
                    None,
                    cut_clip,
                    video_info.filepath,
                    candidate.start, candidate.end,
                    clip_path,
                    True, srt_path,
                )

                job["clips"].append({
                    "index": i,
                    "candidate_index": i,
                    "filepath": str(rendered.filepath),
                    "filename": rendered.filepath.name,
                    "thumbnail": str(rendered.thumbnail_path) if rendered.thumbnail_path else None,
                    "srt": str(rendered.srt_path) if rendered.srt_path else None,
                    "duration": rendered.duration,
                    "width": rendered.width,
                    "height": rendered.height,
                    "size_mb": rendered.size_mb,
                    "url": f"/clips/{rendered.filepath.name}",
                })

        # Cleanup source video to save space
        video_info.filepath.unlink(missing_ok=True)

        job["status"] = "completed"
        job["progress"].append("Done!")

    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        import traceback
        job["traceback"] = traceback.format_exc()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status and results."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]


@app.get("/api/jobs")
async def list_jobs():
    """List all jobs."""
    return list(jobs.values())


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its clips."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs.pop(job_id)
    # Clean up files
    for clip in job.get("clips", []):
        p = Path(clip["filepath"])
        p.unlink(missing_ok=True)
        if clip.get("srt"):
            Path(clip["srt"]).unlink(missing_ok=True)
        if clip.get("thumbnail"):
            Path(clip["thumbnail"]).unlink(missing_ok=True)
    return {"deleted": job_id}


@app.post("/api/clips/render")
async def render_clip(req: RenderClipRequest, bg: BackgroundTasks):
    """Manually render a clip with custom offsets."""
    if req.job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[req.job_id]
    if req.candidate_index >= len(job["candidates"]):
        raise HTTPException(400, "Invalid candidate index")

    candidate = job["candidates"][req.candidate_index]
    clip_id = f"custom_{req.job_id}_{req.candidate_index}_{uuid.uuid4()[:4]}"

    async def do_render():
        clip_path = settings.clips_dir / f"{clip_id}.mp4"
        srt_path = settings.clips_dir / f"{clip_id}.srt"

        video_path = Path(job["video_info"]["filepath"])
        if not video_path.exists():
            # Re-download
            from downloader import download_video
            video_info = download_video(job["url"])
            video_path = video_info.filepath

        transcript = Transcript.from_json(Path(job["transcript_path"]))
        generate_srt(
            [{"start": s.start, "end": s.end, "text": s.text} for s in transcript.segments],
            candidate["start"] + req.start_offset,
            candidate["end"] + req.end_offset,
            srt_path,
        )

        rendered = cut_clip(
            video_path,
            candidate["start"] + req.start_offset,
            candidate["end"] + req.end_offset,
            clip_path,
            req.burn_subtitles,
            srt_path,
        )

        jobs[req.job_id].setdefault("custom_clips", []).append({
            "clip_id": clip_id,
            "filepath": str(rendered.filepath),
            "filename": rendered.filepath.name,
            "duration": rendered.duration,
            "size_mb": rendered.size_mb,
            "url": f"/clips/{rendered.filepath.name}",
        })

    bg.add_task(do_render)
    return {"clip_id": clip_id, "status": "rendering"}


@app.get("/api/clips/{filename}")
async def serve_clip(filename: str):
    """Serve a clip file."""
    clip_path = settings.clips_dir / filename
    if not clip_path.exists():
        raise HTTPException(404, "Clip not found")
    return FileResponse(str(clip_path), media_type="video/mp4")


@app.get("/api/transcript/{job_id}")
async def get_transcript(job_id: str):
    """Get full transcript for a job."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    transcript_path = job.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        raise HTTPException(404, "Transcript not found")
    return json.loads(Path(transcript_path).read_text())


# ─── WebSocket for live progress ──────────────────────

@app.websocket("/ws/{job_id}")
async def ws_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    if job_id not in jobs:
        await websocket.send_text(json.dumps({"error": "Job not found"}))
        await websocket.close()
        return

    last_progress_len = 0
    try:
        while True:
            job = jobs.get(job_id, {})
            current_len = len(job.get("progress", []))
            if current_len > last_progress_len:
                for msg in job["progress"][last_progress_len:]:
                    await websocket.send_text(json.dumps({
                        "status": job["status"],
                        "message": msg,
                    }))
                last_progress_len = current_len

            if job["status"] in ("completed", "error"):
                await websocket.send_text(json.dumps({
                    "status": job["status"],
                    "done": True,
                    **({"error": job.get("error", "")} if job["status"] == "error" else {}),
                }))
                break

            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass


# ─── Tweet generation ─────────────────────────────────

@app.post("/api/generate-tweet")
async def generate_tweet(req: GenerateTweetRequest):
    """Generate tweet text from clip content using OpenClaw LLM."""
    # Simple template-based generation (no external API needed)
    text = req.text.strip()
    speaker = req.speaker.strip()

    if req.style == "hook":
        # Find the most impactful sentence
        import re
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        if not sentences:
            return {"tweet": text[:270]}

        # Pick the best sentence (with numbers or power words)
        power_words = ["never", "biggest", "huge", "secret", "truth", "actually", "real",
                       "largest", "most", "best", "first", "billion", "million", "percent"]

        best = sentences[0]
        best_score = 0
        for s in sentences:
            score = sum(1 for w in power_words if w in s.lower())
            if score > best_score:
                best_score = score
                best = s

        if speaker:
            tweet = f'{speaker}:\n\n"{best}"\n\nThis changes everything.'
        else:
            tweet = f'"{best}"\n\nThis is the moment everything changes.'
    elif req.style == "quote":
        tweet = f'{f"{speaker}:" if speaker else ""}\n\n"{text[:200]}"'
    else:
        tweet = text[:280]

    return {"tweet": tweet[:280], "chars": len(tweet[:280])}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
