"""
Transcription module — Whisper-based.
Handles audio extraction and transcription with word-level timestamps.
"""
import json
import subprocess
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

import whisper

from config import settings


@dataclass
class WordSegment:
    start: float
    end: float
    text: str


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str
    words: list[WordSegment]


@dataclass
class Transcript:
    video_id: str
    language: str
    duration: float
    segments: list[TranscriptSegment]

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "language": self.language,
            "duration": self.duration,
            "segments": [
                {
                    "start": s.start,
                    "end": s.end,
                    "text": s.text,
                    "words": [asdict(w) for w in s.words],
                }
                for s in self.segments
            ],
        }

    def to_json(self, path: Path):
        path.write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False))

    @classmethod
    def from_json(cls, path: Path) -> "Transcript":
        data = json.loads(path.read_text())
        return cls(
            video_id=data["video_id"],
            language=data["language"],
            duration=data["duration"],
            segments=[
                TranscriptSegment(
                    start=s["start"],
                    end=s["end"],
                    text=s["text"],
                    words=[WordSegment(**w) for w in s.get("words", [])],
                )
                for s in data["segments"]
            ],
        )


_model = None


def get_model():
    global _model
    if _model is None:
        print(f"Loading Whisper model: {settings.whisper_model}")
        _model = whisper.load_model(settings.whisper_model)
        print("Whisper model loaded.")
    return _model


def extract_audio(video_path: Path, output_path: Path) -> Path:
    """Extract audio from video file as WAV for whisper."""
    ffmpeg = settings.get_ffmpeg()
    output_path = output_path.with_suffix(".wav")
    cmd = [
        ffmpeg, "-i", str(video_path),
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        "-y", str(output_path),
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return output_path


def transcribe(video_path: Path, video_id: str) -> Transcript:
    """Transcribe video file and return structured transcript."""
    audio_path = extract_audio(video_path, settings.downloads_dir / f"{video_id}_audio")

    model = get_model()
    result = model.transcribe(
        str(audio_path),
        language=settings.whisper_language,
        word_timestamps=True,
    )

    segments = []
    for seg in result["segments"]:
        words = []
        for w in seg.get("words", []):
            words.append(WordSegment(
                start=w.get("start", seg["start"]),
                end=w.get("end", seg["end"]),
                text=w.get("word", "").strip(),
            ))
        segments.append(TranscriptSegment(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
            words=words,
        ))

    # Cleanup audio
    audio_path.unlink(missing_ok=True)

    return Transcript(
        video_id=video_id,
        language=result.get("language", "en"),
        duration=result.get("segments", [{}])[-1].get("end", 0) if segments else 0,
        segments=segments,
    )
