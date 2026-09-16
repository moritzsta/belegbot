"use client";

import { useRef } from "react";
import { Camera, Paperclip } from "lucide-react";
import type { Area } from "@/lib/types";

interface Props {
  area: Area;
  disabled?: boolean;
  onFile: (file: File) => void;
}

/**
 * TK-0007: Schwebender "Scannen"-Button, auf jeder Seite sichtbar.
 * Haupt-Button oeffnet auf dem Handy direkt die Kamera (`capture`), der
 * kleine Neben-Button die Galerie bzw. Dateien (auch PDF). Zwei Inputs,
 * weil `capture` die Galerie-Auswahl unterdrueckt. Am Desktop ignoriert der
 * Browser `capture` und zeigt in beiden Faellen den Dateidialog.
 */
export default function ScanButton({ area, disabled, onFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // gleiche Datei erneut waehlbar
    if (file) onFile(file);
  };

  return (
    <div className="scan-fab">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={handleChange} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        className="btn btn-ghost scan-fab-secondary"
        title="Foto oder PDF auswählen"
        aria-label="Foto oder PDF auswählen"
      >
        <Paperclip size={18} />
      </button>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        className={`btn scan-fab-primary ${area === "shared" ? "btn-teal" : "btn-primary"}`}
      >
        <Camera size={18} />
        Scannen
      </button>
    </div>
  );
}
