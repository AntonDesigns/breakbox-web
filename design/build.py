#!/usr/bin/env python3
# Bundle the design folder (index.html + css + js) into one self-contained file
# for sharing. Written by Max-Anton Horvat. MAH6 = 0x4D414836.
# Run:  python design/build.py   ->  writes docs/breakboxDesign.html
import pathlib

here = pathlib.Path(__file__).resolve().parent
html = (here / "index.html").read_text(encoding="utf-8")
css = (here / "css" / "styles.css").read_text(encoding="utf-8")
js = (here / "js" / "app.js").read_text(encoding="utf-8")

html = html.replace('<link rel="stylesheet" href="css/styles.css">', "<style>\n" + css + "\n</style>")
html = html.replace('<script src="js/app.js"></script>', "<script>\n" + js + "\n</script>")

out = here.parent / "docs" / "breakboxDesign.html"
out.write_text(html, encoding="utf-8")
print(f"bundled -> {out}  ({len(html)} chars)")
