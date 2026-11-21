from pathlib import Path

from PIL import Image, ImageDraw


logo_dir = Path("Logo")
logo_dir.mkdir(exist_ok=True)


def create_icon(size: int, name: str) -> None:
    image = Image.new("RGBA", (size, size), (49, 90, 135, 255))
    draw = ImageDraw.Draw(image)
    margin = max(4, int(size * 0.14))
    width = max(3, int(size * 0.08))
    draw.rectangle(
        (margin, margin, size - margin, size - margin),
        outline=(255, 255, 255, 255),
        width=width,
    )
    draw.line(
        (size // 2, margin, size // 2, size - margin),
        fill=(255, 255, 255, 255),
        width=width,
    )
    draw.line(
        (margin, size // 2, size - margin, size // 2),
        fill=(255, 255, 255, 255),
        width=width,
    )
    image.save(logo_dir / name)


create_icon(180, "apple-touch-icon.png")
create_icon(192, "android-chrome-192.png")
create_icon(512, "android-chrome-512.png")
