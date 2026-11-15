#!/usr/bin/env python3
"""Builds the North Pole Cloud Capstone site: src/pages/**/*.html -> docs/**/*.html

Page sources are plain HTML fragments with three conveniences:
  <!-- title: ... | nav: c1 | desc: ... -->          first line: page metadata
  <code-block lang="hcl" file="main.tf">raw</code-block>   raw text is HTML-escaped for you
  <code-block lang="hcl" file="ecr.tf" src="solutions/capstone-1/ecr.tf"></code-block>   include a tested file
  <shot src="c1-app-live.webp" alt="..." caption="..."></shot>
  {{root}} -> relative path to the site root
"""
import html, pathlib, re, sys, textwrap

ROOT = pathlib.Path(__file__).parent
SRC, OUT = ROOT / "src" / "pages", ROOT / "docs"

NAV = [
    ("home", "index.html", "Home"),
    ("c1", "capstone-1.html", "Mission 1"),
    ("c2", "capstone-2.html", "Mission 2"),
    ("guides", "guides/index.html", "Field Guides"),
]

LAYOUT = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · North Pole Cloud Capstone</title>
<meta name="description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎄</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/css/style.css">
</head>
<body data-page="{nav}" data-root="{root}">
<canvas id="snow" aria-hidden="true"></canvas>
<header class="topbar">
  <a class="brand" href="{root}index.html"><span aria-hidden="true">🎄</span> North Pole <b>Cloud Capstone</b></a>
  <nav aria-label="Main">{navlinks}</nav>
  <div class="tools">
    <button id="team-chip" class="chip" type="button" title="Change team">🦌 <span id="team-chip-name">Pick your team</span></button>
    <button id="snow-toggle" class="chip icon" type="button" aria-pressed="true" title="Toggle snow">❄️</button>
  </div>
</header>
<div class="lights" aria-hidden="true">{lights}</div>
{body}
<footer class="foot">
  <p>🎁 Built for the Cloud Foundations cohort · Be kind to the elves: tear down what you build.</p>
  <p><a href="{root}guides/cleanup.html">Cleanup guide</a> · <a href="{root}guides/troubleshooting.html">Grinch field guide</a> · <a href="{root}instructor.html">Instructor notes</a></p>
</footer>
<dialog id="team-dialog">
  <form method="dialog">
    <h2>🦌 Which reindeer team are you?</h2>
    <p>Your instructor assigns the teams. Your pick personalises every command on this site, so teams never step on each other.</p>
    <div class="team-grid" id="team-grid"></div>
    <p class="small">Stored only in this browser. You can change it any time from the top bar.</p>
    <button class="btn ghost" value="cancel">Close</button>
  </form>
</dialog>
<div id="lightbox" hidden><img alt=""></div>
<script src="{root}assets/js/site.js"></script>
</body>
</html>
"""


HILLS = (
    '<svg class="hills" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true">'
    '<path d="M0 90 C 240 20, 420 130, 720 70 S 1200 20, 1440 80 V150 H0Z" fill="#dfeeff" opacity=".35"/>'
    '<path d="M0 125 C 300 80, 520 150, 820 110 S 1250 90, 1440 120 V150 H0Z" fill="#0b2447"/></svg>'
)
PINES = (
    '<svg class="pines" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'
    + "".join(
        '<g transform="translate(%d,%d) scale(%.2f)"><polygon points="0,-70 22,-30 -22,-30" fill="#0f8a5f"/>'
        '<polygon points="0,-48 30,0 -30,0" fill="#0b6e4f"/><polygon points="0,-70 7,-57 -7,-57" fill="#fff" opacity=".85"/>'
        '<rect x="-4" y="0" width="8" height="10" fill="#4a2c12"/></g>' % t
        for t in [(70, 96, 1.0), (150, 104, .7), (300, 110, .85), (1130, 104, .8), (1250, 98, 1.05), (1360, 106, .7)]
    )
    + "</svg>"
)


def code_block(m):
    attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
    raw = m.group(2)
    if "src" in attrs:
        raw = (ROOT / attrs["src"]).read_text()
    raw = textwrap.dedent(raw.strip("\n").rstrip()).rstrip()
    lang = attrs.get("lang", "text")
    label = attrs.get("file") or {"bash": "Terminal", "hcl": "Terraform", "text": "Output"}.get(lang, lang)
    cls = "code" + (" output" if lang == "text" else "")
    return (
        f'<div class="{cls}"><div class="code-head"><span class="code-file">{html.escape(label)}</span>'
        f'<button class="copy" type="button">Copy</button></div>'
        f'<pre><code class="lang-{lang}">{html.escape(raw, quote=False)}</code></pre></div>'
    )


def shot(m):
    attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
    cap = f'<figcaption>{attrs["caption"]}</figcaption>' if attrs.get("caption") else ""
    return (
        f'<figure class="shot"><img loading="lazy" src="{{{{root}}}}assets/img/{attrs["src"]}" '
        f'alt="{html.escape(attrs.get("alt", ""))}">{cap}</figure>'
    )


def build():
    lights = "".join("<i></i>" for _ in range(40))
    count = 0
    for page in sorted(SRC.rglob("*.html")):
        rel = page.relative_to(SRC)
        text = page.read_text()
        meta = dict(
            (k.strip(), v.strip())
            for k, v in (part.split(":", 1) for part in re.match(r"<!--(.*?)-->", text, re.S).group(1).split("|"))
        )
        body = text.split("-->", 1)[1]
        body = re.sub(r"<code-block([^>]*)>(.*?)</code-block>", code_block, body, flags=re.S)
        body = re.sub(r"<shot([^>]*)></shot>", shot, body, flags=re.S)
        root = "../" * (len(rel.parts) - 1)
        navlinks = "".join(
            '<a href="%s%s"%s>%s</a>' % (root, href, ' class="on"' if key == meta.get("nav") else "", label)
            for key, href, label in NAV
        )
        out = LAYOUT.format(title=meta["title"], desc=meta.get("desc", ""), nav=meta.get("nav", ""), root=root,
                            navlinks=navlinks, lights=lights, body=body)
        out = out.replace("{{hills}}", PINES + HILLS).replace("{{pines}}", PINES).replace("{{root}}", root)
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out)
        count += 1
    print(f"built {count} pages")


if __name__ == "__main__":
    build()
