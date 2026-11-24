"""Render deterministic Sunken Temple composition/state/object SVG guides to PNG.

These are layout/art-direction studies, NOT AI image-model paintings.
Run after export-future-chapter-guides.mjs with Playwright Chromium installed.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

directory = Path("dist/future-chapter-guides/sunken-temple").resolve()
manifest = json.loads((directory / "imagegen-handoff.json").read_text())
world = manifest["dimensions"]
scenes = [manifest["panorama"], *(f["file"] for f in manifest["stateFrames"])]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(
        viewport={"width": world["width"], "height": world["height"]},
        device_scale_factor=1,
    )
    for name in scenes:
        svg = directory / name
        page.goto(svg.as_uri())
        page.screenshot(path=str(svg.with_suffix(".png")), omit_background=True)

    for cutout in manifest["alphaCutouts"]:
        svg = directory / cutout["file"]
        width, height = cutout["size"]
        page.set_viewport_size({"width": int(width), "height": max(1, int(height))})
        page.goto(svg.as_uri())
        page.screenshot(path=str(svg.with_suffix(".png")), omit_background=True)
    browser.close()

print(f"Rendered {len(scenes)} scene PNGs and {len(manifest['alphaCutouts'])} transparent cutout studies")
