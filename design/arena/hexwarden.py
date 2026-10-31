#!/usr/bin/env python3
# The Hexwarden, the boss of the Level-Experimental arena: one body, four states.
# Written by Max-Anton Horvat. MAH6 = 0x4D414836.
# Run:  python design/arena/hexwarden.py  ->  writes the four hexwarden-*.svg files and
#       hexwarden-sheet.html (all four side by side) next to this script.
# I draw every state from this one script on purpose: his body never changes, only what he
# shows (eyes, core, plates, beams, words, rage) moves with how angry he is. The PHASES table
# is the same contract the arena component will follow, so it doubles as the spec.
import math
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
MONO = "'JetBrains Mono',ui-monospace,Consolas,monospace"
SANS = "'Hanken Grotesk',system-ui,-apple-system,sans-serif"
VOICE = "Georgia,'Times New Roman',serif"

# ---- the body, left half only; the right half is its mirror across x = 340 ----
TORSO = "232,292 448,292 484,320 474,380 430,470 410,520 270,520 250,470 206,380 196,320"
HELM = "300,138 380,138 412,168 406,214 380,252 340,268 300,252 274,214 268,168"
HORN = "300,160 258,124 230,84 206,56 196,46 212,66 240,102 270,140 306,178"
HORN_SIDE = "276,206 236,196 212,206 238,212 270,224"
HORN_CRACK = "300,168 264,131 250,114 235,93 222,77"
ARM = ["206,338 180,346 148,414 174,426", "174,426 148,414 112,468 138,480", "149,416 126,404 141,421"]
PALM = "140,478 110,466 94,486 130,500"
CLAWS = ["130,500 140,532 122,502", "118,496 118,534 108,496", "106,490 96,526 98,488", "98,484 76,506 94,480"]
PEC = "214,326 290,316 294,348 222,360"
PAULDRON = "176,300 232,282 262,300 248,344 196,352 172,330"
SPIKES = ["186,304 176,268 200,298", "212,292 208,254 226,288", "238,286 242,256 252,290"]

# eyes as (cx, cy, r). The visor is where he watches from, the body eyes open when he wakes, and
# the wrath eyes only open once he is fully angry, so the eye count itself shows his rage.
VISOR = [(296, 182, 4), (318, 179, 5), (340, 177, 6.5), (362, 179, 5), (384, 182, 4), (305, 199, 3.5),
         (328, 198, 4.2), (352, 198, 4.2), (375, 199, 3.5), (287, 196, 2.4), (393, 196, 2.4)]
BODY_EYES = [(212, 320, 3.5), (234, 332, 2.8), (468, 320, 3.5), (446, 332, 2.8), (240, 334, 3), (440, 334, 3),
             (118, 482, 3.2), (562, 482, 3.2)]
WRATH_EYES = [(280, 147, 2.6), (400, 147, 2.6), (143, 447, 3.2), (537, 447, 3.2)]

VEINS = ["300,352 272,340 250,348", "380,352 408,340 430,348", "300,394 274,404 254,399", "380,394 406,404 426,399"]
VEINS_WRATH = ["250,348 226,362 212,374", "430,348 454,362 468,374", "254,399 236,410", "426,399 444,410"]
SHARDS = ["262,408 270,405 267,414", "282,411 289,408 287,416", "392,410 399,407 397,416", "414,409 421,406 419,414"]
AURA = [("268,100 258,62 280,94", "#e0609a"), ("412,100 422,62 400,94", "#e0609a"), ("334,94 340,62 346,94", "#b48cf2"),
        ("174,176 146,160 168,186", "#b48cf2"), ("506,176 534,160 512,186", "#b48cf2"),
        ("166,236 140,224 160,248", "#e0609a"), ("166,316 132,304 160,330", "#e0609a"),
        ("514,316 548,304 520,330", "#e0609a"), ("120,392 92,380 114,402", "#b48cf2"),
        ("560,392 588,380 566,402", "#b48cf2")]

# the anti-cheats are his armour. A beaten one shatters and pulls itself back together harder.
PLATES = {
    "A": dict(poly="232,420 448,420 442,446 238,446", y=437, name="server-key",
              tag="server-key · reforming harder", tagw=196,
              frags=["234,421 296,421 290,445 240,445", "302,422 358,419 356,446 296,446",
                     "365,421 404,423 400,446 360,446", "410,420 446,422 440,445 405,446"],
              cracks=["299,420 295,428 300,435 293,447", "362,418 358,427 363,435 358,447",
                      "407,419 403,429 408,437 402,447"],
              ghost="230,416 450,416 444,448 236,448"),
    "B": dict(poly="244,450 436,450 429,472 251,472", y=465, name="computed-key",
              tag="computed-key · reforming", tagw=166,
              frags=["246,451 300,451 296,471 252,471", "306,452 360,449 358,472 301,472",
                     "366,451 398,453 395,472 362,472", "404,450 434,452 428,471 400,472"],
              cracks=["303,450 299,458 304,465 298,473", "363,448 359,457 364,465 359,473",
                      "401,449 397,459 402,466 397,473"],
              ghost="241,449 439,449 432,474 248,474"),
    "C": dict(poly="253,476 427,476 419,496 261,496", y=490, name="licence", crack="300,476 306,484 298,490 304,496"),
    "D": dict(poly="263,500 417,500 410,518 270,518", y=513, name="integrity", crack="384,500 380,507 386,512 381,518"),
}

# his body is the levels' own IL: the thing you are cracking is the thing you are fighting
CODE = [
    (304, False, "4D 41 48 36 ldc.i4.0 ret brtrue.s IL_0012 4D 41 48 36 2A"),
    (316.5, False, "call bool Program::IsPremium() stloc.0 ldloc.0 brfalse.s"),
    (329, True, "0x4D414836 ldstr 'BBX-' call string::Concat ret 0x4D414836"),
    (341.5, False, "IL_0000: nop IL_0001: ldarg.0 IL_0002: ldfld int32 Seed"),
    (354, False, "7E 2A 00 00 04 2D 0B 16 2A 4D 41 48 36 17 2A 16 2A 7E 2A"),
    (366.5, False, "ldsfld string Program::ValidKey call bool op_Equality ret"),
    (379, False, "brfalse.s IL_001c ldc.i4.1 stloc.1 br.s IL_0020 ldc.i4.0"),
    (391.5, True, "ldsfld Seed ldc.i4.s 31 mul ldc.i4 1337 add conv.i8 ceq ret"),
    (404, False, "4D 41 48 36 4D 41 48 36 4D 41 48 36 4D 41 48 36 4D 41 48 36"),
    (416.5, False, "callvirt instance bool IsValid(string) pop ret nop ret"),
    (429, False, "throw leave.s endfinally ldnull ldftn newobj callvirt ret"),
    (441.5, False, "16 2A 17 2A 0x4D414836 20 39 05 00 00 58 2A 16 2A 17 2A"),
    (454, False, "IL_0010: ldloc.1 IL_0011: ret IL_0012: ldc.i4.0 IL_0013: ret"),
    (466.5, True, "ldc.i4.0 ret ldc.i4.0 ret ldc.i4.0 ret ldc.i4.0 ret ldc.i4.0"),
    (479, False, "box unbox.any isinst castclass ldtoken sizeof initobj ret"),
    (491.5, False, "0x4D414836 0x4D414836 0x4D414836 0x4D414836 0x4D414836"),
    (504, False, "brtrue brtrue brtrue ldc.i4.1 ret 4D 41 48 36 2A 16 17 2A"),
    (516.5, False, "nop nop nop ret ret ret 4D 41 48 36 ldc.i4.0 ret nop ret"),
]
RAIN = [
    (30, 64, "4D 41 48 36 2A 16 17 2A FF"), (48, 64, "ret nop 0x 4D ldc ret 36 br 00"),
    (30, 320, "41 48 36 4D 2A 17 16 2A 4D 41 48 36 00"), (48, 320, "ret 2A nop 4D ret 41 br 48 ret 36 2A nop 4D"),
    (616, 64, "36 48 41 4D 2A 17 FF 00"), (638, 64, "ret 2A ldc 4D br 36 nop 41"),
    (616, 300, "4D 41 48 36 2A 16 17 2A 4D 41 48 36 00 FF"), (638, 300, "nop ret 4D br 36 ret 2A 41 ldc 48 ret 2A 36 4D"),
]

# ---- the state table: what each phase shows. rage 0-3 contempt, 4-6 enraged, 7-9 wrath ----
PHASES = {
    1: dict(
        file="hexwarden-1-contempt.svg", word="contempt", accent="#8a72c4",
        frame="#22163c", inner="#1a0f2e", rings=("#1f1238", "#1d1134", "#22143e", "#2a1a46"),
        rain="#160d2a", horn="#3d2a66", helm="#4d3780", body="#3a2a66", plate_stroke="#3d2a66", label="#a893d2",
        code=("#221640", "#30225a"), eyes="shut",
        core=[(46, "#6b52a8", 0.08), (34, "#22163c", 1), (24, "#33245c", 1), (13, "#6b52a8", 1)],
        veins=("#6b52a8", 0.22, 1), rays=False, horn_cracks=False, aura=False,
        plates=dict(A="intact", B="intact", C="intact", D="intact"),
        mouth=("#140a22", None, "#7d6aa8"),
        beams=[(346, 178, 512, 232, "#8a72c4", 0.35, "1 4", 0.8)],
        panel=dict(stroke="#3d2a66", head="barely watching", l1="IL_0000: ldstr", caret=617,
                   l2="'BBX-1A2B-3C4D'", status="a string. really?", status_fill="#b07ab8"),
        taunt_label="his only word", taunt=["“Pathetic.”"],
        live=("live · barely watching", "#6b52a8", 492),
        subtitle="the anti-cheat made flesh · dormant, for now",
        phase_label="phase 1 of 3", seg=["#6b52a8"],
        desc="The Hexwarden in phase 1, contempt, for levels 1 to 3. The horned warden built of disassembly "
             "stands dormant in a dark hexagonal arena: every eye shut except one heavy-lidded eye, his rage core "
             "dim and all four anti-cheat plates intact. One faint glance falls on the player's Level 1 key string, "
             "and he says a single word: pathetic. Rage 1 of 9.",
    ),
    2: dict(
        file="hexwarden-2-enraged.svg", word="enraged", accent="#d16be0",
        frame="#2a1a46", inner="#1d1034", rings=("#24143e", "#23143c", "#2c1a4a", "#3a2660"),
        rain="#1d1236", horn="#5b4596", helm="#7a5fc0", body="#4d3780", plate_stroke="#5b4596", label="#cdb9f1",
        code=("#2f2054", "#4a3488"), eyes="open",
        core=[(46, "#b48cf2", 0.2), (34, "#9b4fd6", 1), (24, "#d07af0", 1), (13, "#f6e6ff", 1)],
        veins=("#c77dff", 0.8, 1.2), rays=False, horn_cracks=False, aura=False,
        plates=dict(A="shattered", B="intact", C="intact", D="intact"),
        mouth=("#1e0b30", "#9b4fd6", "#d6c4f6"),
        beams=[(388, 183, 512, 229, "#b48cf2", 0.8, "3 3", 0.9), (366, 181, 512, 235, "#b48cf2", 0.5, "3 3", 0.9)],
        panel=dict(stroke="#5b4596", head="reading your crack", l1="IL_0000: ldc.i4.0", caret=637,
                   l2="IL_0001: ret", status="hesitated 4.2s", status_fill="#e0609a"),
        taunt_label="his only words", taunt=["“You read", "a string.", "I read you.”"],
        live=("live · watching you", "#e0609a", 514),
        subtitle="the anti-cheat made flesh · awake, and angry",
        phase_label="phase 2 of 3", seg=["#3f2a6e", "#53368c", "#6b43a8", "#8c4fc6", "#c062de"],
        desc="The Hexwarden in phase 2, enraged, for levels 4 to 6. Nineteen glowing slit-pupil eyes are open on "
             "his visor, shoulders, chest and palms, his hexagonal rage core is lit, and the beaten server-key plate "
             "is shattered and reforming harder. Two beams lock onto the exact IL line the player is on and note "
             "that they hesitated. He says: you read a string, I read you. Rage 5 of 9.",
    ),
    3: dict(
        file="hexwarden-3-wrath.svg", word="wrath", accent="#ff6fb0",
        frame="#7a2a5e", inner="#4a1a4a", rings=("#4a1a4a", "#6a2050", "#8a2a60", "#e0609a"),
        rain="#261236", horn="#b0368a", helm="#e0609a", body="#b0368a", plate_stroke="#b0368a", label="#f6e6ff",
        code=("#3a1a4c", "#7a2f7a"), eyes="wrath",
        core=[(58, "#e0609a", 0.28), (42, "#b0368a", 1), (30, "#e0609a", 1), (18, "#ff9ad0", 1), (8, "#fff0f8", 1)],
        veins=("#ff6fb0", 1, 1.4), rays=True, horn_cracks=True, aura=True,
        plates=dict(A="shattered", B="shattered", C="cracked", D="cracked"),
        mouth=("#4a0f3a", "#ff6fb0", "#ffe4f3"),
        beams=[(388, 183, 512, 226, "#ff6fb0", 0.9, "6 2", 1), (366, 181, 512, 232, "#ff6fb0", 0.75, "6 2", 1),
               (378, 200, 512, 238, "#ff6fb0", 0.6, "6 2", 1), (395, 197, 512, 244, "#ff6fb0", 0.45, "6 2", 1)],
        panel=dict(stroke="#e0609a", head="reading every key", l1="IL_0042: brtrue.s", caret=637,
                   l2="IL_0044: call Hash", status="patch seen. denied.", status_fill="#ff6fb0"),
        taunt_label="his only words", taunt=["“Every patch", "you make,", "I unmake.”"],
        live=("live · hunting you", "#ff6fb0", 520),
        subtitle="the anti-cheat made flesh · nothing held back",
        phase_label="phase 3 of 3",
        seg=["#3f2a6e", "#53368c", "#6b43a8", "#8c4fc6", "#b04fc0", "#c9509f", "#e0609a", "#ff6fb0"],
        desc="The Hexwarden in phase 3, wrath, for levels 7 to 9. Twenty-three eyes blaze, with new eyes open on "
             "his horns and forearms; his rage core bursts with rays, his horns crack with light and a ring of "
             "shards surrounds him. Two plates are shattered and reforming, two are cracked, and four solid beams "
             "lock onto the player's integrity check. He says: every patch you make, I unmake. Rage 8 of 9.",
    ),
}

# ---- the final form: he stops fighting on your machine and becomes the server ----
SERVER_FILE = "hexwarden-4-server.svg"
SERVER_STYLE = dict(frame="#3a2860", inner="#241539", rings=("#24143e", "#23143c", "#2c1a4a", "#3a2660"),
                    horn="#5b4596", helm="#7a5fc0", horn_cracks=False)
SERVER = "222,118 458,118 470,140 470,540 210,540 210,140"
SERVER_PALM = "186,306 210,304 210,382 188,380"
SERVER_CLAWS = ["200,308 236,316 204,320", "198,328 238,335 202,340", "198,348 236,354 202,359",
                "200,368 230,373 203,377"]
# every client-side move he has watched you use, now hitting a wall it cannot reach past:
# (tag x, tag y, tag width, move, arrow from, arrow to, arrow y, what happened, caption y, caption anchor)
MOVES = [
    (48, 409, 70, "patch", 118, 206, 420, "rejected", 438, "end"),
    (48, 465, 92, "breakpoint", 140, 206, 476, "nothing to step", 500, "end"),
    (576, 409, 70, "forge", 576, 474, 420, "signature fails", 438, "start"),
    (570, 465, 76, "keygen", 570, 474, 476, "key never leaves", 500, "start"),
]
SERVER_DESC = ("The Hexwarden's final form, the server. He has withdrawn into a server monolith: his horns rise over "
               "its top, his claws grip its sides and his eyes watch from behind bars in a slit. Where his rage core "
               "was, a lock seal reads server-signed, ECDSA P-256. The player's client-side moves, patch, breakpoint, "
               "forge and keygen, all strike the wall and fail. He says: nothing on your machine reaches me. The "
               "meter is full and the wall holds.")

CAPTIONS = [
    ("1 · contempt", "levels 1-3 · rage 1",
     "Dormant. Every eye shut but one, and that one barely open. He glances at your Level 1 key string and gives "
     "you one word."),
    ("2 · enraged", "levels 4-6 · rage 4-6",
     "Awake. Nineteen eyes open and two beams sit on the exact instruction you are on. The first anti-cheat you "
     "beat is already reforming harder."),
    ("3 · wrath", "levels 7-9 · rage 7-9",
     "Nothing held back. New eyes open on his horns and arms, two plates shatter and re-form, and four solid "
     "beams hunt every keystroke."),
    ("final form · the server", "after level 9",
     "He withdraws behind the wall. Your patch, breakpoint, forge and keygen all hit it and fail, because the "
     "check never runs on your machine. The thesis, as a boss."),
]


def mirror(points):
    flipped = []
    for pair in points.split():
        x, y = pair.split(",")
        flipped.append(f"{680 - float(x):g},{y}")
    return " ".join(flipped)


def hexagon(cx, cy, r):
    pts = []
    for k in range(6):
        a = math.radians(-90 + 60 * k)
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)


def text(x, y, s, fill, size=11, font=SANS, anchor=None, extra=""):
    a = f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x:g}" y="{y:g}"{a} style="font-family:{font};font-size:{size}px{extra}" fill="{fill}">{s}</text>'


def poly(points, fill, stroke=None, width=None, extra=""):
    s = f' stroke="{stroke}" stroke-width="{width}"' if stroke else ""
    return f'<polygon points="{points}" fill="{fill}"{s}{extra}/>'


def pair(points, fill=None):
    # one left-hand shape and its mirror, for the many symmetric parts
    f = f' fill="{fill}"' if fill else ""
    return f'<polygon points="{points}"{f}/><polygon points="{mirror(points)}"{f}/>'


def open_svg(title, desc):
    return (f'<svg width="680" height="676" viewBox="0 0 680 676" role="img" xmlns="http://www.w3.org/2000/svg">'
            f'<title>{title}</title><desc>{desc}</desc>'
            '<rect x="0" y="0" width="680" height="676" fill="#0c0617"/>')


def rain(fill, lower=True):
    cols = []
    for x, y, toks in RAIN:
        if y > 100 and not lower:
            continue
        spans = "".join(f'<tspan x="{x}" dy="{0 if i == 0 else 16}">{tok}</tspan>' for i, tok in enumerate(toks.split()))
        cols.append(f'<text x="{x}" y="{y}">{spans}</text>')
    return f'<g style="font-family:{MONO};font-size:11px" fill="{fill}">' + "".join(cols) + "</g>"


def arena(p):
    r = p["rings"]
    return (poly("340,70 539.2,185 539.2,415 340,530 140.8,415 140.8,185", "#100820", p["frame"], 0.75)
            + poly("340,100 513.2,200 513.2,400 340,500 166.8,400 166.8,200", "none", p["inner"], 0.75)
            + f'<ellipse cx="340" cy="548" rx="300" ry="30" fill="#120a21" stroke="{r[0]}" stroke-width="0.75"/>'
            + f'<ellipse cx="340" cy="548" rx="230" ry="22" fill="none" stroke="{r[1]}" stroke-width="0.75"/>'
            + f'<ellipse cx="340" cy="548" rx="160" ry="15" fill="none" stroke="{r[2]}" stroke-width="0.75"/>'
            + f'<ellipse cx="340" cy="548" rx="90" ry="9" fill="none" stroke="{r[3]}" stroke-width="0.75"/>')


def aura():
    return "".join(f'<polygon points="{pts}" fill="{c}" opacity="0.5"/>' for pts, c in AURA)


def horns(p):
    out = [poly(HORN, "#1f1334", p["horn"], 0.75), poly(mirror(HORN), "#1f1334", p["horn"], 0.75)]
    ridges = [(258, 124, 270, 140), (230, 84, 240, 102), (206, 56, 212, 66)]
    lines = "".join(f'<line x1="{a}" y1="{b}" x2="{c}" y2="{d}"/><line x1="{680 - a}" y1="{b}" x2="{680 - c}" y2="{d}"/>'
                    for a, b, c, d in ridges)
    out.append(f'<g stroke="#3d2a66" stroke-width="1">{lines}</g>')
    out += [poly(HORN_SIDE, "#1f1334", p["horn"], 0.6), poly(mirror(HORN_SIDE), "#1f1334", p["horn"], 0.6)]
    if p["horn_cracks"]:
        out.append(f'<g fill="none" stroke="#ff6fb0" stroke-width="1.2" opacity="0.9">'
                   f'<polyline points="{HORN_CRACK}"/><polyline points="{mirror(HORN_CRACK)}"/></g>')
    out += [poly("314,140 322,122 330,140", "#241539", p["horn"], 0.5),
            poly("350,140 358,122 366,140", "#241539", p["horn"], 0.5),
            poly("332,140 340,106 348,140", "#2b1a48", p["helm"], 0.6)]
    return "".join(out)


def arms(p):
    limbs = "".join(pair(a) for a in ARM)
    claws = "".join(pair(c) for c in CLAWS)
    return (f'<g fill="#1b1030" stroke="#44306e" stroke-width="0.6">{limbs}</g>'
            f'<g fill="#24163d" stroke="{p["horn"]}" stroke-width="0.6">{pair(PALM)}</g>'
            f'<g fill="#2f1e50" stroke="{p["helm"]}" stroke-width="0.5">{claws}</g>')


NECK = ('<rect x="324" y="262" width="32" height="30" fill="#170d29"/>'
        '<g stroke="#3d2a66" stroke-width="1"><line x1="326" y1="270" x2="354" y2="270"/>'
        '<line x1="326" y1="278" x2="354" y2="278"/><line x1="326" y1="286" x2="354" y2="286"/></g>')


def code(p, clip):
    dim, hot = p["code"]
    lines = "".join(f'<text x="192" y="{y:g}" fill="{hot if bright else dim}">{s}</text>' for y, bright, s in CODE)
    return f'<g clip-path="url(#{clip})" style="font-family:{MONO};font-size:11px">{lines}</g>'


def pecs(p):
    return f'<g fill="#21153a" stroke="{p["body"]}" stroke-width="0.6">{pair(PEC)}</g>'


def rays():
    tris = []
    for deg, length in ((-170, 74), (-145, 74), (-120, 64), (-60, 64), (-35, 74), (-10, 74), (10, 72), (170, 72)):
        a = math.radians(deg)
        dx, dy = math.cos(a), math.sin(a)
        b1 = (340 + 30 * dx - 3.5 * dy, 372 + 30 * dy + 3.5 * dx)
        b2 = (340 + 30 * dx + 3.5 * dy, 372 + 30 * dy - 3.5 * dx)
        tip = (340 + length * dx, 372 + length * dy)
        tris.append(f'<polygon points="{b1[0]:.1f},{b1[1]:.1f} {tip[0]:.1f},{tip[1]:.1f} {b2[0]:.1f},{b2[1]:.1f}"/>')
    return '<g fill="#e0609a" opacity="0.55">' + "".join(tris) + "</g>"


def core(p):
    out = []
    for r, fill, op in p["core"]:
        out.append(poly(hexagon(340, 372, r), fill, extra=f' opacity="{op}"' if op < 1 else ""))
    return "".join(out)


def veins(p):
    color, op, width = p["veins"]
    lines = VEINS + (VEINS_WRATH if p["rays"] else [])
    body = "".join(f'<polyline points="{v}"/>' for v in lines)
    return f'<g fill="none" stroke="{color}" stroke-width="{width}" opacity="{op}">{body}</g>'


def plates(p):
    out = []
    for key in "ABCD":
        d, state = PLATES[key], p["plates"][key]
        if state == "shattered":
            frags = "".join(f'<polygon points="{f}"/>' for f in d["frags"])
            cracks = "".join(f'<polyline points="{c}"/>' for c in d["cracks"])
            out += [f'<g fill="#2e1d4f" stroke="{p["helm"]}" stroke-width="0.6">{frags}</g>',
                    f'<g fill="none" stroke="#e0609a" stroke-width="1.3">{cracks}</g>',
                    f'<polygon points="{d["ghost"]}" fill="none" stroke="#d07af0" stroke-width="1.3" stroke-dasharray="5 3"/>',
                    f'<rect x="{340 - d["tagw"] / 2:g}" y="{d["y"] - 11}" width="{d["tagw"]}" height="15" rx="2" fill="#140a24" opacity="0.88"/>',
                    text(340, d["y"], d["tag"], "#f6ecff", font=MONO, anchor="middle")]
        else:
            out.append(poly(d["poly"], "#22153d", p["plate_stroke"], 0.6))
            if state == "cracked":
                out.append(f'<polyline points="{d["crack"]}" fill="none" stroke="#e0609a" stroke-width="1.1"/>')
            out.append(text(340, d["y"], d["name"], p["label"], font=MONO, anchor="middle"))
    if "shattered" in p["plates"].values():
        out.append('<g fill="#d07af0">' + "".join(f'<polygon points="{s}"/>' for s in SHARDS) + "</g>")
    return "".join(out)


def gorget(p):
    return (poly("290,288 390,288 382,306 298,306", "#2b1b47", p["helm"], 0.6)
            + text(340, 301, "0x4D414836", "#b9a3e8", font=MONO, anchor="middle"))


def pauldrons(p):
    spikes = "".join(pair(s) for s in SPIKES)
    return (f'<g fill="#2b1b47" stroke="{p["helm"]}" stroke-width="0.6">{pair(PAULDRON)}</g>'
            f'<g fill="#241539" stroke="{p["helm"]}" stroke-width="0.5">{spikes}</g>')


def helm(p):
    mouth, glow, teeth = p["mouth"]
    out = [poly(HELM, "#2a1a44", p["helm"], 0.75),
           '<g stroke="#3d2a66" stroke-width="0.8" fill="none"><polyline points="300,138 288,168 290,212 308,248"/>'
           '<polyline points="380,138 392,168 390,212 372,248"/></g>',
           poly("276,170 404,170 400,210 280,210", "#0e0619", p["horn"], 0.6),
           poly("302,226 378,226 370,246 310,246", mouth, p["horn"], 0.5)]
    if glow:
        out.append(f'<line x1="312" y1="236" x2="368" y2="236" stroke="{glow}" stroke-width="1.5"/>')
    top = "".join(f'<polygon points="{x},226 {x + 8},226 {x + 4},234"/>' for x in (306, 314, 322, 330, 342, 350, 358, 366))
    bottom = "".join(f'<polygon points="{x},246 {x + 8},246 {x + 4},238"/>' for x in (312, 322, 332, 340, 350, 360))
    out.append(f'<g fill="{teeth}">{top}{bottom}</g>')
    return "".join(out)


def eye(cx, cy, r, mode, main=False):
    if mode == "shut":
        return (f'<line x1="{cx - r:g}" y1="{cy}" x2="{cx + r:g}" y2="{cy}" stroke="#4a3878" '
                'stroke-width="1.2" stroke-linecap="round"/>')
    if mode == "lidded":
        return (f'<circle cx="{cx}" cy="{cy}" r="{r * 1.4:.1f}" fill="#8a72c4" opacity="0.15"/>'
                f'<ellipse cx="{cx}" cy="{cy + 1}" rx="{r}" ry="{r * 0.36:.1f}" fill="#cdb9f1"/>'
                f'<ellipse cx="{cx}" cy="{cy + 1}" rx="0.9" ry="{r * 0.3:.1f}" fill="#12081f"/>'
                f'<line x1="{cx - r - 1:g}" y1="{cy - 1.4:g}" x2="{cx + r + 1:g}" y2="{cy - 1.4:g}" stroke="#6b52a8" '
                'stroke-width="1.6" stroke-linecap="round"/>')
    if mode == "wrath":
        return (f'<circle cx="{cx}" cy="{cy}" r="{r * 2.2:.1f}" fill="#e0609a" opacity="0.38"/>'
                f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffe4f3"/>'
                f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#ff6fb0" stroke-width="0.8"/>'
                f'<ellipse cx="{cx}" cy="{cy}" rx="{max(0.7, r * 0.18):.1f}" ry="{r * 0.75:.1f}" fill="#12081f"/>')
    if mode == "cold":
        iris, op = "#ece2ff", 0.25
    else:
        iris, op = ("#f3e6ff", 0.35) if main else ("#e2d0ff", 0.3)
    return (f'<circle cx="{cx}" cy="{cy}" r="{r * 1.9:.1f}" fill="#b48cf2" opacity="{op}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{iris}"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{max(0.8, r * 0.23):.1f}" ry="{r * 0.7:.1f}" fill="#12081f"/>')


def eyes(p):
    mode = p["eyes"]
    out = []
    for cx, cy, r in VISOR:
        main = (cx, cy) == (340, 177)
        if mode == "shut":
            out.append(eye(cx, cy, r, "lidded" if main else "shut"))
        else:
            out.append(eye(cx, cy, r, mode, main))
    out += [eye(cx, cy, r, mode) for cx, cy, r in BODY_EYES]
    if mode == "wrath":
        out += [eye(cx, cy, r, "wrath") for cx, cy, r in WRATH_EYES]
    return "".join(out)


DISSOLVE = ("".join(f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{c}"/>' for x, y, s, c in [
    (276, 522, 8, "#3a2766"), (292, 529, 6, "#2a1a46"), (306, 524, 10, "#4d3780"), (324, 533, 5, "#2a1a46"),
    (338, 526, 9, "#3a2766"), (356, 531, 6, "#4d3780"), (370, 523, 8, "#2a1a46"), (386, 529, 7, "#3a2766"),
    (400, 522, 6, "#4d3780"), (286, 542, 4, "#2a1a46"), (318, 546, 6, "#3a2766"), (350, 549, 4, "#2a1a46"),
    (378, 543, 5, "#3a2766"), (302, 556, 3, "#2a1a46"), (364, 558, 3, "#2a1a46")])
    + f'<g style="font-family:{MONO};font-size:11px" fill="#3a2766"><text x="258" y="552">4D</text>'
      '<text x="404" y="554">36</text></g>')


def beams(p):
    return "".join(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}" '
                   f'stroke-dasharray="{dash}" opacity="{op}"/>' for x1, y1, x2, y2, c, op, dash, w in p["beams"])


def panel(d):
    # the in-arena dnSpy, as he sees it: the line you are on, the next one, and his verdict
    return (f'<rect x="512" y="196" width="136" height="90" rx="4" fill="#120a22" stroke="{d["stroke"]}" stroke-width="0.75"/>'
            + text(522, 213, d["head"], "#c9b5ef", extra=";letter-spacing:0.5px")
            + '<rect x="516" y="222" width="128" height="15" fill="#2c1650"/>'
            + text(522, 233, d["l1"], "#f3e6ff", font=MONO)
            + f'<rect x="{d["caret"]}" y="224" width="2" height="12" fill="#e0609a"/>'
            + text(522, 252, d["l2"], "#8f78c2", font=MONO)
            + text(522, 274, d["status"], d["status_fill"]))


def taunt(label, lines):
    out = [text(32, 214, label, "#7a63b4", extra=";letter-spacing:1px")]
    out += [text(32, 240 + 22 * i, line, "#efe3ff", size=16, font=VOICE, extra=";font-style:italic")
            for i, line in enumerate(lines)]
    return "".join(out)


def topbar(live):
    label, dot, cx = live
    return (text(32, 36, "level-experimental · final boss", "#8a72c4", extra=";letter-spacing:1.2px")
            + f'<circle cx="{cx}" cy="32" r="3.5" fill="{dot}"/>'
            + text(648, 36, label, "#c9b5ef", anchor="end", extra=";letter-spacing:0.5px"))


def nameplate(subtitle):
    return ('<line x1="32" y1="590" x2="648" y2="590" stroke="#2a1a46" stroke-width="0.75"/>'
            + text(32, 628, "The Hexwarden", "#f2e8ff", size=34, extra=";font-weight:500;letter-spacing:0.5px")
            + text(32, 652, subtitle, "#9b84cf", size=13))


def rage_meter(p):
    out = [nameplate(p["subtitle"]), text(400, 610, "rage", "#c9b5ef", extra=";letter-spacing:1px"),
           text(648, 610, p["phase_label"], p["accent"], anchor="end")]
    for i in range(9):
        x = 400 + 28 * i
        if i < len(p["seg"]):
            ring = ' stroke="#f3d4ff" stroke-width="1"' if i == len(p["seg"]) - 1 else ""
            out.append(f'<rect x="{x}" y="617" width="24" height="16" rx="2" fill="{p["seg"][i]}"{ring}/>')
        else:
            out.append(f'<rect x="{x}" y="617" width="24" height="16" rx="2" fill="#150b26" stroke="#3a2860" stroke-width="0.75"/>')
    out += ['<line x1="482" y1="613" x2="482" y2="637" stroke="#5b4596" stroke-width="1"/>',
            '<line x1="566" y1="613" x2="566" y2="637" stroke="#5b4596" stroke-width="1"/>']
    for x, word in ((440, "contempt"), (524, "enraged"), (608, "wrath")):
        out.append(text(x, 652, word, p["accent"] if word == p["word"] else "#5a4a86", anchor="middle"))
    return "".join(out)


def scene(n):
    p = PHASES[n]
    clip = f"hxbody-{n}"   # unique per state, so two states on one page never share a clip
    parts = [open_svg(f"The Hexwarden, phase {n} of 3: {p['word']}", p["desc"]),
             f'<defs><clipPath id="{clip}"><polygon points="{TORSO}"/></clipPath></defs>',
             rain(p["rain"]), arena(p), aura() if p["aura"] else "", horns(p), arms(p), NECK,
             poly(TORSO, "#170c2a", p["body"], 0.75), code(p, clip), pecs(p), rays() if p["rays"] else "",
             core(p), veins(p), plates(p), gorget(p), pauldrons(p), helm(p), eyes(p), DISSOLVE, beams(p),
             panel(p["panel"]), taunt(p["taunt_label"], p["taunt"]), topbar(p["live"]), rage_meter(p), "</svg>"]
    return "\n".join(x for x in parts if x)


def spark(x, y):
    return (f'<g stroke="#e0609a" stroke-width="1.2"><line x1="{x - 7}" y1="{y - 7}" x2="{x + 7}" y2="{y + 7}"/>'
            f'<line x1="{x - 7}" y1="{y + 7}" x2="{x + 7}" y2="{y - 7}"/><line x1="{x}" y1="{y - 9}" x2="{x}" y2="{y + 9}"/>'
            f'<line x1="{x - 10}" y1="{y}" x2="{x + 10}" y2="{y}"/></g><circle cx="{x}" cy="{y}" r="2.4" fill="#ffe4f3"/>')


def server_scene():
    p = SERVER_STYLE
    parts = [open_svg("The Hexwarden, final form: the server", SERVER_DESC),
             rain("#1d1236", lower=False), arena(p), horns(p),
             f'<g fill="#1b1030" stroke="#44306e" stroke-width="0.6">{pair(SERVER_PALM)}</g>',
             poly(SERVER, "#140a24", "#5b4596", 1),
             text(340, 140, "server-side", "#8a72c4", anchor="middle", extra=";letter-spacing:3px"),
             poly("240,150 440,150 436,190 244,190", "#0e0619", "#5b4596", 0.6)]
    parts += [eye(cx, cy - 12, r, "cold") for cx, cy, r in VISOR]
    parts.append('<g stroke="#2a1a46" stroke-width="2.5">'
                 + "".join(f'<line x1="{x}" y1="151" x2="{x}" y2="189"/>' for x in range(254, 436, 14)) + "</g>")
    leds = ("#b48cf2", "#4d3780", "#4d3780", "#e0609a", "#b48cf2", "#4d3780")
    for i, y in enumerate(range(206, 530, 26)):
        parts.append(f'<rect x="226" y="{y}" width="228" height="18" rx="2" fill="#1b1030" stroke="#2e2150" stroke-width="0.5"/>'
                     f'<line x1="236" y1="{y + 9}" x2="420" y2="{y + 9}" stroke="#22163a" stroke-width="1"/>'
                     f'<circle cx="442" cy="{y + 9}" r="2.2" fill="{leds[i % len(leds)]}"/>')
    parts += ['<rect x="226" y="285" width="228" height="16" fill="#0e0619" opacity="0.92"/>',
              text(340, 297, "the check never runs on your machine", "#c9b5ef", anchor="middle"),
              # where his rage core was: a signature now, the licence grant he signs and you cannot forge
              poly(hexagon(340, 360, 46), "#1a0f2e", "#b48cf2", 1.5),
              poly(hexagon(340, 360, 34), "#24163d", "#6b52a8", 0.75),
              '<path d="M 332 359 V 352 A 8 8 0 0 1 348 352 V 359" fill="none" stroke="#b48cf2" stroke-width="3"/>',
              '<rect x="327" y="358" width="26" height="20" rx="3" fill="#b48cf2"/>',
              '<circle cx="340" cy="366" r="2.6" fill="#1a0f2e"/><rect x="339" y="367" width="2" height="6" fill="#1a0f2e"/>',
              '<rect x="226" y="413" width="228" height="16" fill="#0e0619" opacity="0.92"/>',
              text(340, 425, "server-signed · ECDSA P-256", "#b9a3e8", font=MONO, anchor="middle"),
              '<g fill="#2f1e50" stroke="#7a5fc0" stroke-width="0.5">' + "".join(pair(c) for c in SERVER_CLAWS) + "</g>"]
    for tx, ty, tw, move, x1, x2, ay, what, cy, anchor in MOVES:
        parts += [f'<rect x="{tx}" y="{ty}" width="{tw}" height="22" rx="4" fill="#1a0f2e" stroke="#6b52a8" stroke-width="0.75"/>',
                  text(tx + tw / 2, ty + 15, move, "#d9c8f7", font=MONO, anchor="middle"),
                  f'<line x1="{x1}" y1="{ay}" x2="{x2}" y2="{ay}" stroke="#8a72c4" stroke-width="1.2" stroke-dasharray="4 3"/>',
                  spark(210 if x2 < 340 else 470, ay),
                  text(x2, cy, what, "#e0609a", anchor=anchor)]
    meter = ([nameplate("final form · the server · out of your reach"),
              text(400, 610, "the wall", "#c9b5ef", extra=";letter-spacing:1px"),
              text(648, 610, "final form", "#b48cf2", anchor="end")]
             + [f'<rect x="{400 + 28 * i}" y="617" width="24" height="16" rx="2" fill="{"#b48cf2" if i == 8 else "#5b4596"}"/>'
                for i in range(9)]
             + ['<rect x="652" y="613" width="5" height="24" fill="#e0609a"/>',
                text(400, 652, "levels 1-9 cleared", "#7a63b4"),
                text(648, 652, "the wall holds", "#b48cf2", anchor="end")])
    parts += ['<line x1="384" y1="170" x2="512" y2="230" stroke="#b48cf2" stroke-width="0.8" opacity="0.6"/>',
              panel(dict(stroke="#6b52a8", head="your move", l1="forge: grant.sig", caret=631,
                         l2="verify: P-256 fail", status="denied, server-side", status_fill="#e0609a")),
              taunt("his only words", ["“Nothing on", "your machine", "reaches me.”"]),
              topbar(("live · out of reach", "#b48cf2", 516)), "".join(meter), "</svg>"]
    return "\n".join(parts)


def sheet(svgs):
    figs = "".join(f'<figure>{svg}<figcaption><b>{title}</b><span class="k">{levels}</span><br>{body}</figcaption></figure>'
                   for (title, levels, body), svg in zip(CAPTIONS, svgs))
    return ("<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>The Hexwarden</title>"
            "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500"
            "&family=JetBrains+Mono:wght@400;500&display=swap\"><style>"
            "body{margin:0;background:#0b0614;color:#e8dcff;font-family:'Hanken Grotesk',system-ui,sans-serif}"
            ".wrap{max-width:1180px;margin:0 auto;padding:28px 16px 48px}"
            "h1{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500;font-size:22px;margin:0 0 8px}"
            ".lede{color:#9b84cf;margin:0 0 22px;max-width:72ch;line-height:1.6}"
            ".grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}"
            "@media (max-width:820px){.grid{grid-template-columns:1fr}}"
            "figure{margin:0;border:1px solid #2a1a46;border-radius:8px;background:#0c0617;overflow:hidden}"
            "figure svg{display:block;width:100%;height:auto}"
            "figcaption{padding:12px 14px 14px;border-top:1px solid #2a1a46;font-size:14px;line-height:1.55;color:#cdbaf0}"
            "figcaption b{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500;color:#f2e8ff}"
            ".k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:#9b84cf;margin-left:10px}"
            "</style></head><body><div class=\"wrap\"><h1>The Hexwarden</h1>"
            "<p class=\"lede\">The boss of the Level-Experimental arena. One body, four states, all generated by "
            "hexwarden.py from one table; that table is the contract the arena component follows. Which state you "
            "see, and how angry he is, is decided on the server, never in your browser.</p>"
            f"<div class=\"grid\">{figs}</div></div></body></html>\n")


def main():
    svgs = [scene(1), scene(2), scene(3), server_scene()]
    names = [PHASES[1]["file"], PHASES[2]["file"], PHASES[3]["file"], SERVER_FILE]
    for name, svg in zip(names, svgs):
        (HERE / name).write_text(svg + "\n", encoding="utf-8")
    (HERE / "hexwarden-sheet.html").write_text(sheet(svgs), encoding="utf-8")
    print("wrote", ", ".join(names), "+ hexwarden-sheet.html in", HERE)


if __name__ == "__main__":
    main()
