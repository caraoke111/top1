// Genera la imagen PNG del "NOVO #1" a partir de datos REALES del ranking.
// Corre server-side (Vercel, runtime nodejs). Usa sharp + opentype + la fuente
// bundleada (lib/PermanentMarker.ttf).

import fs from "fs";
import path from "path";
import sharp from "sharp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const opentype = require("opentype.js");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FONT: any = null;
function font() {
  if (!FONT) {
    const p = path.join(process.cwd(), "lib", "PermanentMarker.ttf");
    FONT = opentype.parse(fs.readFileSync(p).buffer);
  }
  return FONT;
}
const P = (t: string, x: number, y: number, s: number) =>
  font().getPath(String(t), x, y, s).toPathData(2);
const W = (t: string, s: number) => font().getAdvanceWidth(String(t), s);
const Pc = (t: string, cx: number, y: number, s: number) => P(t, cx - W(t, s) / 2, y, s);

const brl = (c: number) => "R$ " + (c / 100).toFixed(2).replace(".", ",");

const crown = (x: number, y: number, s: number) => `
  <g transform="translate(${x} ${y}) scale(${s})" stroke="#1C1915" stroke-width="11" stroke-linejoin="round" fill="#FAF6F1">
    <path d="M 0 112 L 0 27 L 50 72 L 98 0 L 146 72 L 196 27 L 196 112 Z"/>
    <rect x="0" y="108" width="196" height="34" rx="8"/>
    <circle cx="0" cy="27" r="13"/><circle cx="98" cy="0" r="15"/><circle cx="196" cy="27" r="13"/>
  </g>`;

export async function generarTarjetaPNG(data: {
  handle: string;
  name?: string;
  amountCents: number;
}): Promise<Buffer> {
  const cx = 540;
  const iniciales = (data.name || data.handle || "?").slice(0, 2).toUpperCase();
  const nombre = (data.name || data.handle || "").toUpperCase();
  const handle = "@" + String(data.handle || "").replace(/^@/, "");

  const dots = Array.from({ length: 70 })
    .map(() => `<circle cx="${(Math.random() * 1080) | 0}" cy="${(Math.random() * 1350) | 0}" r="3" fill="#e7ded2"/>`)
    .join("");

  const svg = `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f09433"/><stop offset="1" stop-color="#bc1888"/>
    </linearGradient></defs>
    <rect width="1080" height="1350" fill="#FAF6F1"/>
    ${dots}
    ${crown(70, 70, 0.55)}
    <path d="${P("EgoTop", 190, 150, 66)}" fill="#1C1915"/>
    <path d="${P("egotop.lol", 1010 - W("egotop.lol", 40), 145, 40)}" fill="#F26430"/>
    <rect x="${cx - 250}" y="240" width="500" height="86" rx="43" fill="#E03B2F"/>
    <path d="${Pc("NOVO #1", cx - 26, 302, 54)}" fill="#FAF6F1"/>
    ${crown(cx + 150, 256, 0.28)}
    <circle cx="${cx}" cy="560" r="150" fill="url(#av)" stroke="#1C1915" stroke-width="10"/>
    <path d="${Pc(iniciales, cx, 605, 120)}" fill="#FAF6F1"/>
    <path d="${Pc(nombre, cx, 800, 72)}" fill="#1C1915"/>
    <path d="${Pc(handle, cx, 862, 44)}" fill="#6b625a"/>
    <rect x="${cx - 300 + 14}" y="954" width="600" height="200" rx="40" fill="#1C1915"/>
    <rect x="${cx - 300}" y="940" width="600" height="200" rx="40" fill="#F26430" stroke="#1C1915" stroke-width="10"/>
    <path d="${Pc("pagou pra ser o #1", cx, 1000, 34)}" fill="#FAF6F1"/>
    <path d="${Pc(brl(data.amountCents), cx, 1105, 96)}" fill="#FAF6F1" stroke="#1C1915" stroke-width="3"/>
    <path d="${Pc("Acha que é melhor? PROVE.", cx, 1250, 46)}" fill="#1C1915"/>
    <path d="${Pc("egotop.lol", cx, 1310, 44)}" fill="#F26430"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
