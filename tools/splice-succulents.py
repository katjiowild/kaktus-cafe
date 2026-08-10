#!/usr/bin/env python3
"""
Cut a wide plant sheet into the eight illustrations it holds.

The art arrives from the illustrator as one strip per species: levels 1–4
healthy, then levels 1–4 neglected, laid out left to right on transparency.
This finds the gutters by looking for columns with no opaque pixels, so it
doesn't care that the plants are unevenly spaced or different widths.

Each plant is then trimmed to its own bounding box and scaled to a common
256px height — matching the assets already in public/succulents. Level is
never encoded in the file size: the app scales a plant by its growth stage at
render time, so every level ships at the same height.

    python3 tools/splice-succulents.py "Barrel Cactus.png:barrel-cactus" …

Each argument is `<source path>:<slug>`; output lands in public/succulents as
{slug}-l{1..4}-{healthy|neglected}.png.
"""
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "succulents"
TARGET_H = 256
# Anything fainter is antialiasing fringe, not plant.
ALPHA_FLOOR = 8
# Two plants are separate if there is any clear column between them; the strips
# leave a wide gutter, so this only has to beat the fringe.
MIN_GUTTER = 2


def columns_with_ink(im: Image.Image) -> list[bool]:
    w, h = im.size
    alpha = im.getchannel("A").load()
    ink = []
    for x in range(w):
        # Every other row: a plant spans hundreds of rows, so this can't miss one.
        ink.append(any(alpha[x, y] > ALPHA_FLOOR for y in range(0, h, 2)))
    return ink


def split(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, _ = im.size
    ink = columns_with_ink(im)

    runs, start = [], None
    for x, on in enumerate(ink):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, w))

    # Drop stray specks, then rejoin anything the fringe split in two.
    runs = [r for r in runs if r[1] - r[0] > w * 0.008]
    merged: list[tuple[int, int]] = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < MIN_GUTTER:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)

    return [im.crop((x0, 0, x1, im.size[1])) for x0, x1 in merged]


def normalise(plant: Image.Image) -> Image.Image:
    box = plant.getbbox()
    if box:
        plant = plant.crop(box)
    w, h = plant.size
    return plant.resize((max(1, round(w * TARGET_H / h)), TARGET_H), Image.LANCZOS)


def main(args: list[str]) -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    failed = False

    for arg in args:
        src, _, slug = arg.rpartition(":")
        path = Path(src)
        plants = split(path)
        if len(plants) != 8:
            print(f"!! {path.name}: found {len(plants)} plants, expected 8 — skipped")
            failed = True
            continue
        for i, plant in enumerate(plants):
            state = "healthy" if i < 4 else "neglected"
            level = (i % 4) + 1
            out = OUT / f"{slug}-l{level}-{state}.png"
            normalise(plant).save(out, optimize=True)
        print(f"   {path.name} -> {slug} (8 files)")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
