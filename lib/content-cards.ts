// Tarjetas de contenido recurrente (reinado diario, top 5 semanal).
// Server-side (Vercel). sharp + opentype + fuente bundleada.

import fs from "fs";
import path from "path";
import sharp from "sharp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const opentype = require("opentype.js");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FONT: any = null;
function font() {
  if (!FONT) FONT = opentype.parse(fs.readFileSync(path.join(process.cwd(), "lib", "PermanentMarker.ttf")).buffer);
  return FONT;
}
const P = (t: string, x: number, y: number, s: number) => font().getPath(String(t), x, y, s).toPathData(2);
const W = (t: string, s: number) => font().getAdvanceWidth(String(t), s);
const Pc = (t: string, cx: number, y: number, s: number) => P(t, cx - W(t, s) / 2, y, s);
const brl = (c: number) => "R$ " + (c / 100).toFixed(2).replace(".", ",");
const crown = (x: number, y: number, s: number) => `
  <g transform="translate(${x} ${y}) scale(${s})" stroke="#1C1915" stroke-width="11" stroke-linejoin="round" fill="#FAF6F1">
    <path d="M 0 112 L 0 27 L 50 72 L 98 0 L 146 72 L 196 27 L 196 112 Z"/>
    <rect x="0" y="108" width="196" height="34" rx="8"/>
    <circle cx="0" cy="27" r="13"/><circle cx="98" cy="0" r="15"/><circle cx="196" cy="27" r="13"/>
  </g>`;
const dots = () => Array.from({ length: 70 }).map(() => `<circle cx="${(Math.random() * 1080) | 0}" cy="${(Math.random() * 1350) | 0}" r="3" fill="#e7ded2"/>`).join("");
const header = () => `${crown(70, 70, 0.55)}
  <path d="${P("EgoTop", 190, 150, 66)}" fill="#1C1915"/>
  <path d="${P("egotop.lol", 1010 - W("egotop.lol", 40), 145, 40)}" fill="#F26430"/>`;
const render = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

// ── REINADO (diario): cuánto tiempo lleva el #1 en el topo ──
export async function generarReinado(d: { handle: string; name?: string; amountCents: number; horas: number }): Promise<Buffer> {
  const cx = 540;
  const iniciales = (d.name || d.handle || "?").slice(0, 2).toUpperCase();
  const tiempo = d.horas >= 24 ? `${Math.floor(d.horas / 24)}d ${d.horas % 24}h` : `${d.horas}h`;
  const svg = `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f09433"/><stop offset="1" stop-color="#bc1888"/></linearGradient></defs>
    <rect width="1080" height="1350" fill="#FAF6F1"/>${dots()}${header()}
    <rect x="${cx - 260}" y="240" width="520" height="86" rx="43" fill="#1C1915"/>
    <path d="${Pc("REI ATUAL", cx - 24, 302, 52)}" fill="#FAF6F1"/>${crown(cx + 168, 256, 0.28)}
    <circle cx="${cx}" cy="560" r="150" fill="url(#av)" stroke="#1C1915" stroke-width="10"/>
    <path d="${Pc(iniciales, cx, 605, 120)}" fill="#FAF6F1"/>
    <path d="${Pc((d.name || d.handle).toUpperCase(), cx, 800, 72)}" fill="#1C1915"/>
    <path d="${Pc("@" + d.handle.replace(/^@/, ""), cx, 862, 44)}" fill="#6b625a"/>
    <rect x="${cx - 300 + 14}" y="954" width="600" height="200" rx="40" fill="#1C1915"/>
    <rect x="${cx - 300}" y="940" width="600" height="200" rx="40" fill="#F26430" stroke="#1C1915" stroke-width="10"/>
    <path d="${Pc("no topo há", cx, 1000, 34)}" fill="#FAF6F1"/>
    <path d="${Pc(tiempo, cx, 1108, 100)}" fill="#FAF6F1" stroke="#1C1915" stroke-width="3"/>
    <path d="${Pc("Ninguém derruba?", cx, 1250, 44)}" fill="#1C1915"/>
    <path d="${Pc("egotop.lol", cx, 1310, 44)}" fill="#F26430"/>
  </svg>`;
  return render(svg);
}

// ── TOP 5 (semanal) ──
export async function generarTop5(rows: { rank: number; handle: string; amountCents: number }[]): Promise<Buffer> {
  const cx = 540;
  const filas = rows.slice(0, 5).map((r, i) => {
    const y = 470 + i * 150;
    const medalla = ["1", "2", "3", "4", "5"][i];
    return `
      <rect x="90" y="${y - 60}" width="900" height="120" rx="24" fill="${i === 0 ? "#F26430" : "#efe9e0"}" stroke="#1C1915" stroke-width="${i === 0 ? 6 : 3}"/>
      <path d="${P("#" + medalla, 130, y + 24, 60)}" fill="${i === 0 ? "#FAF6F1" : "#1C1915"}"/>
      <path d="${P("@" + r.handle.replace(/^@/, "").slice(0, 16), 260, y + 20, 46)}" fill="${i === 0 ? "#FAF6F1" : "#1C1915"}"/>
      <path d="${P(brl(r.amountCents), 990 - W(brl(r.amountCents), 46), y + 20, 46)}" fill="${i === 0 ? "#FAF6F1" : "#F26430"}"/>`;
  }).join("");
  const svg = `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#FAF6F1"/>${dots()}${header()}
    <path d="${Pc("TOP 5 AGORA", cx - 40, 340, 66)}" fill="#1C1915"/>${crown(cx + 190, 295, 0.3)}
    ${filas}
    <path d="${Pc("Seu nome merece estar aqui.", cx, 1270, 42)}" fill="#1C1915"/>
    <path d="${Pc("egotop.lol", cx, 1325, 40)}" fill="#F26430"/>
  </svg>`;
  return render(svg);
}
