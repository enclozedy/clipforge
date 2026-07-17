"""
Clip rendering module — ffmpeg wrapper.
Cuts clips, generates thumbnails, burns subtitles.
"""
import subprocess
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from config import settings


@dataclass
class RenderedClip:
    filepath: Path
    thumbnail_path: Optional[Path]
    srt_path: Optional[Path]
    duration: float
    width: int
    height: int
    size_mb: float


def format_timestamp(seconds: float) -> str:
    """Format seconds as SRT timestamp (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(segments: list[dict], clip_start: float, clip_end: float, output_path: Path):
    """Generate .srt subtitle file for a clip."""
    srt_entries = []
    idx = 1
    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]
        # Skip segments outside clip range
        if seg_end < clip_start or seg_start > clip_end:
            continue
        # Clamp to clip boundaries
        rel_start = max(0, seg_start - clip_start)
        rel_end = min(clip_end - clip_start, seg_end - clip_start)
        text = seg["text"].strip()
        if text:
            srt_entries.append(f"{idx}\n{format_timestamp(rel_start)} --> {format_timestamp(rel_end)}\n{text}\n")
            idx += 1

    output_path.write_text("\n".join(srt_entries))
    return output_path


def cut_clip(
    video_path: Path,
    start: float,
    end: float,
    output_path: Path,
    burn_subtitles: bool = False,
    srt_path: Optional[Path] = None,
) -> RenderedClip:
    """Cut a clip from video using ffmpeg."""
    ffmpeg = settings.get_ffmpeg()
    duration = end - start

    # Build ffmpeg command
    cmd = [
        ffmpeg,
        "-ss", f"{start:.2f}",
        "-i", str(video_path),
        "-t", f"{duration:.2f}",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-y",
    ]

    if burn_subtitles and srt_path and srt_path.exists():
        # Escape path for ffmpeg subtitles filter
        srt_escaped = str(srt_path).replace(":", "\\:").replace("'", "\\'")
        cmd.extend(["-vf", f"subtitles='{srt_escaped}':force_style='FontSize=16,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=30'"])

    cmd.append(str(output_path))

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg clip cut failed: {result.stderr}")

    # Generate thumbnail at 25% into clip
    thumbnail_path = None
    thumb_path = output_path.with_suffix(".jpg")
    thumb_time = duration * 0.25
    thumb_cmd = [
        ffmpeg,
        "-ss", f"{thumb_time:.2f}",
        "-i", str(output_path),
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        str(thumb_path),
    ]
    thumb_result = subprocess.run(thumb_cmd, capture_output=True)
    if thumb_result.returncode == 0:
        thumbnail_path = thumb_path

    # Get clip info
    info_cmd = [ffmpeg, "-i", str(output_path), "-hide_banner"]
    info_result = subprocess.run(info_cmd, capture_output=True, text=True)
    width, height = 1920, 1080
    for line in info_result.stderr.split("\n"):
        if "Stream #0:0" in line and "Video" in line:
            import re
            res_match = re.search(r"(\d+)x(\d+)", line)
            if res_match:
                width, height = int(res_match.group(1)), int(res_match.group(2))

    size_mb = output_path.stat().st_size / (1024 * 1024)

    return RenderedClip(
        filepath=output_path,
        thumbnail_path=thumbnail_path,
        srt_path=srt_path,
        duration=duration,
        width=width,
        height=height,
        size_mb=round(size_mb, 2),
    )


def generate_waveform(video_path: Path, output_path: Path, width: int = 1200, height: int = 200):
    """Generate waveform PNG from video's audio."""
    ffmpeg = settings.get_ffmpeg()
    cmd = [
        ffmpeg,
        "-i", str(video_path),
        "-filter_complex", f"compand,showwavespic=s={width}x{height}:colors=white",
        "-frames:v", "1",
        "-y",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True)
    return output_path if result.returncode == 0 else None
