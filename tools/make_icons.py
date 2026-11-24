"""Draws Moodreel's app icons as PNGs using only the Python standard library.
Run from the Moodreel folder:  python3 tools/make_icons.py
Design: velvet-red square, a ring of gold marquee bulbs, cream play triangle.
"""
import math
import os
import struct
import zlib

RED_TOP = (190, 22, 34)
RED_BOT = (110, 10, 17)
WHITE = (255, 244, 220)
BULB = (255, 214, 102)
GOLD = (255, 201, 61)


def png(path, size, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))


def in_triangle(px, py, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
    d1, d2, d3 = sign((px, py), a, b), sign((px, py), b, c), sign((px, py), c, a)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)


def star_points(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def in_polygon(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def color_at(u, v, scale):
    """u, v in 0..1. scale shrinks the artwork toward the centre (for maskable safe zone)."""
    bg = tuple(int(RED_TOP[k] + (RED_BOT[k] - RED_TOP[k]) * v) for k in range(3))
    x, y = (u - 0.5) / scale, (v - 0.5) / scale
    r = math.hypot(x, y)
    # 18 marquee bulbs on a circle, with a soft glow around each
    for i in range(18):
        ang = i * 2 * math.pi / 18
        d = math.hypot(x - 0.36 * math.cos(ang), y - 0.36 * math.sin(ang))
        if d <= 0.034:
            return BULB
        if d <= 0.05:
            bg = tuple(int(bg[k] + (BULB[k] - bg[k]) * 0.35) for k in range(3))
    if in_triangle(x, y, (-0.10, -0.17), (-0.10, 0.17), (0.19, 0.0)):
        return WHITE
    return bg


def render(size, scale, ss=3):
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = color_at((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, scale)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
            n = ss * ss
            row.extend((acc[0] // n, acc[1] // n, acc[2] // n))
        rows.append(row)
    return rows


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
    os.makedirs(out, exist_ok=True)
    for name, size, scale in [('icon-192.png', 192, 1.0), ('icon-512.png', 512, 1.0),
                              ('maskable-512.png', 512, 0.78), ('apple-touch-icon.png', 180, 0.92)]:
        png(os.path.join(out, name), size, render(size, scale))
        print('wrote', name)
