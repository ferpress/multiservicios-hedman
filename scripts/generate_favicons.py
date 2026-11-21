from pathlib import Path

from PIL import Image


logo_dir = Path("Logo")
logo_dir.mkdir(exist_ok=True)
logo = Image.open(logo_dir / "Logo Hedman.webp").convert("RGBA")


def create_icon(size: int, name: str) -> None:
    image = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    mark = logo.copy()
    mark.thumbnail((int(size * 0.9), int(size * 0.9)), Image.Resampling.LANCZOS)
    position = ((size - mark.width) // 2, (size - mark.height) // 2)
    image.alpha_composite(mark, position)
    image.save(logo_dir / name)


create_icon(180, "apple-touch-icon.png")
create_icon(192, "android-chrome-192.png")
create_icon(512, "android-chrome-512.png")
create_icon(16, "favicon-16.png")
create_icon(32, "favicon-32.png")

favicon = Image.new("RGBA", (48, 48), (255, 255, 255, 0))
mark = logo.copy()
mark.thumbnail((43, 43), Image.Resampling.LANCZOS)
favicon.alpha_composite(mark, ((48 - mark.width) // 2, (48 - mark.height) // 2))
favicon.save("favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
