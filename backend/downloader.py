"""
Download module — yt-dlp wrapper.
Downloads videos in best quality and extracts metadata.
"""
import subprocess
import json
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from config import settings


@dataclass
class VideoInfo:
    id: str
    title: str
    channel: str
    duration: float
    thumbnail: str
    upload_date: str
    description: str
    filepath: Path
    width: int
    height: int


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    # Fallback: use URL hash
    return url.split("/")[-1].split("?")[0][:11]


def get_video_info(url: str) -> dict:
    """Get video metadata without downloading."""
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-playlist",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp info failed: {result.stderr}")
    return json.loads(result.stdout)


def download_video(url: str) -> VideoInfo:
    """Download video in best quality."""
    video_id = extract_video_id(url)
    output_template = str(settings.downloads_dir / f"{video_id}.%(ext)s")

    cmd = [
        "yt-dlp",
        "-f", settings.ytdlp_format,
        "-o", output_template,
        "--no-playlist",
        "--write-thumbnail",
        "--print-json",
        url,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp download failed: {result.stderr}")

    info = json.loads(result.stdout) if result.stdout else {}
    filepath = settings.downloads_dir / f"{video_id}.mp4"

    if not filepath.exists():
        # Find the actual file
        files = list(settings.downloads_dir.glob(f"{video_id}.*"))
        video_files = [f for f in files if f.suffix in (".mp4", ".webm", ".mkv")]
        if video_files:
            filepath = video_files[0]

    return VideoInfo(
        id=video_id,
        title=info.get("title", video_id),
        channel=info.get("uploader", info.get("channel", "Unknown")),
        duration=info.get("duration", 0),
        thumbnail=info.get("thumbnail", ""),
        upload_date=info.get("upload_date", ""),
        description=info.get("description", "")[:500],
        filepath=filepath,
        width=info.get("width", 1920),
        height=info.get("height", 1080),
    )
