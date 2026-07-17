from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Paths
    workspace_dir: Path = Path(__file__).parent / "workspace"
    clips_dir: Path = Path(__file__).parent / "workspace" / "clips"
    downloads_dir: Path = Path(__file__).parent / "workspace" / "downloads"
    thumbnails_dir: Path = Path(__file__).parent / "workspace" / "thumbnails"

    # Whisper
    whisper_model: str = "tiny"  # tiny, base, small, medium, large
    whisper_language: str = "en"

    # yt-dlp
    ytdlp_format: str = "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best"
    ytdlp_cookies: str | None = None  # Path to cookies file

    # Clip defaults
    min_clip_duration: float = 30.0
    max_clip_duration: float = 60.0
    default_clip_count: int = 5

    # Server
    host: str = "0.0.0.0"
    port: int = 8100
    base_url: str = ""  # For reverse proxy, e.g. https://clip.visionsec.tech"
    cors_origins: list[str] = ["*"]

    # ffmpeg
    ffmpeg_path: str = ""  # auto-detect if empty

    model_config = {"env_prefix": "CLIPFORGE_", "env_file": ".env"}

    def ensure_dirs(self):
        for d in [self.workspace_dir, self.clips_dir, self.downloads_dir, self.thumbnails_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def get_ffmpeg(self) -> str:
        if self.ffmpeg_path:
            return self.ffmpeg_path
        # Try common locations
        import shutil
        for candidate in ["ffmpeg", str(Path.home() / "bin" / "ffmpeg"),
                          "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]:
            path = shutil.which(candidate) or (candidate if Path(candidate).exists() else None)
            if path:
                return path
        return "ffmpeg"


settings = Settings()
settings.ensure_dirs()
