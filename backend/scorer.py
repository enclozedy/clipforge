"""
Clip scoring engine — finds the best moments in a transcript.
Uses keyword density, emotional markers, and context heuristics.
"""
import re
from dataclasses import dataclass
from typing import Optional

from transcriber import Transcript, TranscriptSegment


# Hooks and power words that signal high-value moments
HOOK_PATTERNS = [
    # Shock / surprise
    r"\b(never|biggest|huge|massive|insane|crazy|shocking|unbelievable|extraordinary)\b",
    r"\b(largest|fastest|most|worst|best|first|revolutionary)\b",
    # Numbers / scale
    r"\b\$\d+[bmk]?\b",
    r"\b\d+(million|billion|trillion|percent|%)\b",
    # Future predictions
    r"\b(will|going to|future|next decade|by 20\d0|transform|change everything)\b",
    # Authority
    r"\b(proven|research|data shows|study|evidence|fact)\b",
    # Emotional
    r"\b(fear|danger|threat|opportunity|breakthrough|secret|truth)\b",
    # Action
    r"\b(must|need to|have to|should|stop|start|begin)\b",
    # Contrasts
    r"\b(but|however|actually|real|truth is|problem is)\b",
]

NEGATIVE_PATTERNS = [
    r"\b(um|uh|so|like|you know|sort of|kind of)\b",
    r"\b(anyway|anyways|whatever|basically)\b",
]

# Weight per category
SCORE_WEIGHTS = {
    "hook": 3.0,
    "numbers": 2.5,
    "future": 2.0,
    "authority": 1.5,
    "emotional": 2.0,
    "action": 1.5,
    "contrast": 1.5,
    "negative": -1.0,
}


@dataclass
class ClipCandidate:
    start: float
    end: float
    text: str
    score: float
    score_breakdown: dict
    headline: str  # Best phrase in the clip


def score_segment(text: str) -> dict:
    """Score a text segment based on hook patterns."""
    text_lower = text.lower()
    breakdown = {}

    for i, pattern in enumerate(HOOK_PATTERNS):
        matches = re.findall(pattern, text_lower)
        category = list(SCORE_WEIGHTS.keys())[i] if i < len(SCORE_WEIGHTS) else "hook"
        if matches:
            weight = SCORE_WEIGHTS.get(category, 1.0)
            breakdown[category] = len(matches) * weight

    for pattern in NEGATIVE_PATTERNS:
        matches = re.findall(pattern, text_lower)
        if matches:
            breakdown["negative"] = breakdown.get("negative", 0) + len(matches) * SCORE_WEIGHTS["negative"]

    return breakdown


def find_best_phrase(text: str, max_words: int = 15) -> str:
    """Extract the most impactful phrase from text."""
    # Find sentences
    sentences = re.split(r"[.!?]+", text)
    if not sentences:
        return text[:100]

    best_score = -1
    best_phrase = sentences[0].strip()

    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        words = sent.split()
        if len(words) > max_words:
            # Try to find best window
            for i in range(len(words) - max_words + 1):
                window = " ".join(words[i:i + max_words])
                score = sum(len(re.findall(p, window.lower())) * w
                           for p, w in zip(HOOK_PATTERNS, SCORE_WEIGHTS.values()))
                if score > best_score:
                    best_score = score
                    best_phrase = window
        else:
            score = sum(len(re.findall(p, sent.lower())) * w
                       for p, w in zip(HOOK_PATTERNS, SCORE_WEIGHTS.values()))
            if score > best_score:
                best_score = score
                best_phrase = sent

    return best_phrase


def generate_candidates(
    transcript: Transcript,
    min_duration: float = 30.0,
    max_duration: float = 60.0,
    step_seconds: float = 5.0,
) -> list[ClipCandidate]:
    """
    Slide a window across the transcript and score each window.
    Returns sorted list of clip candidates.
    """
    if not transcript.segments:
        return []

    # Build flat word list with timestamps
    all_words = []
    for seg in transcript.segments:
        for w in seg.words:
            all_words.append((w.start, w.end, w.text))

    if len(all_words) < 10:
        return []

    candidates = []
    total_duration = transcript.duration or all_words[-1][1]

    # Slide window
    current_start = max(all_words[0][0], 1.0)  # Skip first second

    while current_start < total_duration - min_duration:
        window_end = current_start + max_duration
        # Gather words in window
        window_words = [(s, e, t) for s, e, t in all_words if s >= current_start and e <= window_end]

        if not window_words:
            current_start += step_seconds
            continue

        # Adjust clip boundaries to word boundaries
        clip_start = window_words[0][0]
        clip_end = window_words[-1][1]
        clip_duration = clip_end - clip_start

        if clip_duration < min_duration:
            # Extend end
            remaining = [w for w in all_words if w[0] >= clip_end]
            for s, e, t in remaining:
                window_words.append((s, e, t))
                clip_end = e
                if clip_end - clip_start >= min_duration:
                    break

        clip_duration = clip_end - clip_start
        if clip_duration < min_duration:
            current_start += step_seconds
            continue

        # Build text from words
        clip_text = " ".join(t for _, _, t in window_words)

        # Score
        breakdown = score_segment(clip_text)
        total_score = sum(breakdown.values())

        if total_score > 0:
            headline = find_best_phrase(clip_text)
            candidates.append(ClipCandidate(
                start=clip_start,
                end=clip_end,
                text=clip_text,
                score=total_score,
                score_breakdown=breakdown,
                headline=headline,
            ))

        current_start += step_seconds

    # Deduplicate overlapping candidates (keep highest scored)
    candidates.sort(key=lambda c: c.score, reverse=True)
    deduped = []
    for c in candidates:
        overlaps = False
        for d in deduped:
            # Check if significant overlap
            overlap_start = max(c.start, d.start)
            overlap_end = min(c.end, d.end)
            overlap = max(0, overlap_end - overlap_start)
            min_dur = min(c.end - c.start, d.end - d.start)
            if min_dur > 0 and overlap / min_dur > 0.5:
                overlaps = True
                break
        if not overlaps:
            deduped.append(c)

    return deduped


def get_top_clips(
    transcript: Transcript,
    count: int = 5,
    min_duration: float = 30.0,
    max_duration: float = 60.0,
) -> list[ClipCandidate]:
    """Get top N non-overlapping clip candidates."""
    candidates = generate_candidates(transcript, min_duration, max_duration)
    return candidates[:count]
