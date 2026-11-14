"""Run existing Playwright tests with inline HTML when navigation is blocked.

The bundled game is unchanged. Only about:blank's unavailable localStorage API
is replaced with an in-memory map. Real input, physics, and rendering run.
"""
import runpy
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import Page

original_goto = Page.goto


def goto(page, url, **kwargs):
    if not url.startswith("file:"):
        return original_goto(page, url, **kwargs)
    path = Path(unquote(urlparse(url).path))
    page.wonderwood_html = path
    page.evaluate("""() => {
      const entries = new Map();
      Object.defineProperty(window, 'localStorage', {configurable: true, value: {
        getItem: key => entries.has(key) ? entries.get(key) : null,
        setItem: (key, value) => entries.set(String(key), String(value)),
        removeItem: key => entries.delete(String(key)),
        clear: () => entries.clear()
      }});
    }""")
    return page.set_content(path.read_text(), wait_until="load", timeout=120000)


def reload(page, **kwargs):
    return page.set_content(page.wonderwood_html.read_text(),
                            wait_until="load", timeout=120000)


Page.goto = goto
Page.reload = reload
runpy.run_path(str(Path(sys.argv[1]).resolve()), run_name="__main__")
