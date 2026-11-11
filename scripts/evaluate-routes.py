"""Actual-physics route diagnostics for LLM-generated Wonderwood levels.

Usage:
  python scripts/evaluate-routes.py
  python scripts/evaluate-routes.py path/to/candidate-design.json

Uses Chromium to advance the real game simulation; there is no second,
approximate collision/physics implementation. Probes start near each named
challenge boundary, assume a required form was already befriended, and
disable wildlife combat. They are NOT full-level completion proofs.
"""
import json
import sys
from html import escape
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
artifact = root / "dist" / "wonderwood.html"
output = root / "dist"
candidate = Path(sys.argv[1]) if len(sys.argv) > 1 else None
designs = json.loads((candidate or root / "src/games/animal-adventure/designs.json").read_text())
if "version" in designs and "id" in designs:
    designs = {designs["id"]: designs}
source = artifact.read_text().replace("requestAnimationFrame(frame);", "")
source = source.replace(
    "<script>\nwindow.WW",
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',
    1,
)
report = {"method": "Actual Chromium WW.games.animals.start/update, 60Hz; local section spawns",
          "limits": "Wildlife disabled; required forms granted; scripted traversal only. "
                    "No failure proves a section impossible; no success proves entire campaign completable.",
          "worlds": []}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 810})
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.set_content(source, wait_until="domcontentloaded")
    page.add_script_tag(content=(root / "scripts/route-probes.js").read_text())
    for name, design in designs.items():
        result = page.evaluate("""(spec) => {
          const chapter=WW.chapters.find(c=>c.id===spec.id) || {
            id:spec.id,name:spec.id,biome:spec.biome,
            goals:[{kind:spec.relic[0],name:'Relic',hint:'Retrieve the light'}],
            signs:[],events:[]
          };
          const level=WW.worldCompiler.compile(spec,chapter);
          return {
            id:spec.id,
            diagnostics:level.diagnostics,
            sections:WW_ROUTE_PROBES.inspect(level),
            goal:WW_ROUTE_PROBES.goal(level)
          };
        }""", design)
        report["worlds"].append(result)
        cleared = sum(section["crossed"] for section in result["sections"])
        print(f"{name}: probes crossed {cleared}/{len(result['sections'])} sections")
        for section in result["sections"]:
            for note in section["notes"]:
                print(f"  {section['id']}: {note}")
        if result["goal"]:
            status = "COLLECTED" if result["goal"]["collected"] else "NOT COLLECTED"
            print(f"  Relic: {status} after {result['goal']['frames']} local physics frames")
    assert not errors, errors

    # Regression: a full-height wall must stop the movement probe. This
    # catches any accidental change that bypasses authoritative game collision.
    if not candidate:
        assert all(world["goal"] and world["goal"]["collected"]
                   for world in report["worlds"]), [
            (world["id"],world["goal"]) for world in report["worlds"]
            if not world["goal"] or not world["goal"]["collected"]
        ]
        test = page.evaluate("""() => {
          const level=WW.worlds.create(WW.chapters[0]);
          const section=level.sections[0];
          const normal=WW_ROUTE_PROBES.run(level,section,
            {id:'walk',form:null,rhythm:'walk'}, {frames:220});
          const blocked=WW.worlds.create(WW.chapters[0]);
          for(const row of blocked.grid)row[25]='ground';
          const wall=WW_ROUTE_PROBES.run(blocked,section,
            {id:'walk',form:null,rhythm:'walk'}, {frames:340});
          return {normal:normal.furthestTile,
            blocked:wall.furthestTile,wallReached:wall.reached};
        }""")
        assert test["normal"] > 30, test
        assert test["blocked"] < 26 and not test["wallReached"], test
    browser.close()

output.mkdir(exist_ok=True)
(output / "route-probes.json").write_text(json.dumps(report, indent=2) + "\n")
rows = []
index = 0
for world in report["worlds"]:
    rows.append(f'<text x="26" y="{42 + index*32}" font-size="13" font-weight="bold" '
                f'fill="#f4efd8">{escape(world["id"])}</text>')
    index += 1
    for section in world["sections"]:
        y = 30 + index * 32
        attempts = section["attempts"]
        left = 365
        rows.append(f'<text x="30" y="{y+15}" font-size="11" '
                    f'fill="#dae9e6">{escape(section["id"])}</text>')
        for offset, attempt in enumerate(attempts):
            progress = max(0, min(1, (attempt["furthestTile"] - attempt["startTile"]) /
                                      max(1, attempt["targetTile"] - attempt["startTile"])))
            color = "#80dcac" if attempt["reached"] else "#f6be80"
            x = left + offset * 196
            rows.append(f'<rect x="{x}" y="{y}" width="172" height="11" '
                        f'rx="5" fill="#395362"/>')
            rows.append(f'<rect x="{x}" y="{y}" width="{172*progress:.1f}" '
                        f'height="11" rx="5" fill="{color}"/>')
            rows.append(f'<text x="{x}" y="{y+22}" font-size="9" fill="#d1e6e5">'
                        f'{escape(attempt["strategy"])} · '
                        f'{progress*100:.0f}%</text>')
        index += 1
height = 48 + index * 32
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" '
       f'viewBox="0 0 1000 {height}">'
       f'<rect width="1000" height="{height}" fill="#183544"/>'
       '<text x="25" y="20" fill="#ffdfa2" font-size="16" font-weight="bold">'
       'Wonderwood · Actual-physics traversal probes</text>'
       '<text x="365" y="30" fill="#cbdcda" font-size="10">'
       'Walk · Jump · Intended form (green reached; amber stalled)</text>'
       + "\n".join(rows) + "</svg>\n")
(output / "preview-route-probes.svg").write_text(svg)
print("PASS: actual-gameplay traversal diagnostics, wall collision regression and SVG review")
