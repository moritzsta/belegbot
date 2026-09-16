#!/usr/bin/env node
/**
 * TK-0006: Generiert die PWA-Icon-Familie aus public/brand/icon.png.
 *
 * Android Chrome verlangt fuer eine echte PWA-Installation (nicht nur
 * "Verknuepfung") explizit 192x192 UND 512x512 PNG-Icons mit passendem
 * `sizes` im Manifest, plus eine `maskable`-Variante mit Safe-Zone fuer den
 * Launcher-Beschnitt (Kreis/Squircle).
 *
 * Quelle ist bereits ein fertiges 512er Icon mit dunklem Hintergrund und
 * amberfarbenem Quadrat (~76% Kantenlaenge). Fuer "any" reicht Skalieren.
 * Fuer "maskable" wird das Motiv auf ~60% geschrumpft und mit derselben
 * Hintergrundfarbe aufgefuellt, damit der beschnittene Rand sauber bleibt.
 *
 * Output: public/icons/icon-{192,512}.png, icon-{192,512}-maskable.png,
 *         public/apple-touch-icon.png (180x180, iOS liest das Meta-Tag direkt)
 *
 * Aufruf: node scripts/generate-pwa-icons.mjs
 * `sharp` kommt transitiv ueber Next.js mit — keine eigene Dependency noetig.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "brand", "icon.png");
const OUT_DIR = join(ROOT, "public", "icons");

// Amber-Quadrat belegt ~76% der Quelle; Maskable-Safe-Zone ist der innere
// 80%-Kreis, also Quadrat auf ~60% bringen -> Quelle auf 0.6/0.76 skalieren.
const MASKABLE_SCALE = 0.79;

/** Hintergrundfarbe aus der Ecke der Quelle lesen, damit Auffuellung nahtlos ist. */
async function cornerColor() {
  const { data } = await sharp(SRC).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2], alpha: 1 };
}

async function plain(size, output) {
  await sharp(SRC).resize(size, size).png().toFile(output);
  console.log(`  -> ${output}`);
}

async function maskable(size, output, background) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const motif = await sharp(SRC).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: motif, gravity: "center" }])
    .png()
    .toFile(output);
  console.log(`  -> ${output}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const bg = await cornerColor();
  console.log(`Quelle: ${SRC} — Hintergrund rgb(${bg.r},${bg.g},${bg.b})`);
  await plain(192, join(OUT_DIR, "icon-192.png"));
  await plain(512, join(OUT_DIR, "icon-512.png"));
  await maskable(192, join(OUT_DIR, "icon-192-maskable.png"), bg);
  await maskable(512, join(OUT_DIR, "icon-512-maskable.png"), bg);
  await plain(180, join(ROOT, "public", "apple-touch-icon.png"));
  console.log("Fertig.");
}

main().catch((err) => { console.error(err); process.exit(1); });
