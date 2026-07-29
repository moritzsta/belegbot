# -*- coding: utf-8 -*-
"""belegbot 3D-Emblem-Icon — FLUX text2img (1024x1024). GELB-Job mit GPU-Ampel-Lock."""
import json, sys, time, urllib.request
from pathlib import Path
from PIL import Image

PIPE = Path(r"F:\WebApps\KI Video Generierung")
sys.path.insert(0, str(PIPE / "scripts"))
import gpu_ampel  # noqa

COMFY_URL = "http://127.0.0.1:8188"
COMFY_OUTPUT = Path(r"F:\ComfyUI\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\output")
OUT = Path(r"F:\WebApps\belegbot\public\brand")

PREFIX = "belegbot_icon"
W = H = 1024
STEPS, GUIDANCE, SEED = 32, 3.8, 43317

PROMPT = (
    "A premium 3D app icon emblem, centered, single badge with a rounded-square shape and soft "
    "rounded corners, made of glossy amber-gold material (#E8A838) with a subtle brushed-metal sheen "
    "and soft bevelled edges. A single bold geometric sans-serif capital letter B, cleanly extruded and "
    "embossed in the very center of the badge, dark charcoal (#0D0F14) inset. Floating in a deep "
    "near-black void background (#0D0F14). Soft three-point studio lighting: warm amber key light from "
    "upper-left, a subtle cool teal rim light (#3FC9C0) tracing the right edge. Gentle reflections, a "
    "soft warm contact glow beneath the badge, shallow depth of field. High-end product icon "
    "visualization, octane render, sharp focus on the emblem, dark moody background, lots of negative "
    "space. One single letter B only, no other text."
)
NEGATIVE = (
    "watermark, signature, low quality, jpeg artifacts, blurry, noisy, extra letters, multiple letters, "
    "words, sentences, gibberish text, garbled typography, cluttered, busy, flat 2d sticker, "
    "photograph of real paper, hands, people, oversaturated, neon, rainbow, white background"
)


def build_workflow():
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {
            "clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux_ae.safetensors"}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": PROMPT, "clip": ["2", 0]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["2", 0]}},
        "7": {"class_type": "FluxGuidance", "inputs": {"guidance": GUIDANCE, "conditioning": ["5", 0]}},
        "8": {"class_type": "EmptyLatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["7", 0], "negative": ["6", 0], "latent_image": ["8", 0],
            "seed": SEED, "steps": STEPS, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["3", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": PREFIX}},
    }


def queue(wf):
    data = json.dumps({"prompt": wf}).encode()
    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["prompt_id"]


def wait_for_file(prefix, timeout=600):
    start = time.time()
    seen = 0
    ex = sorted(COMFY_OUTPUT.glob(f"{prefix}*.png"), key=lambda p: p.stat().st_mtime)
    if ex:
        seen = ex[-1].stat().st_mtime
    while time.time() - start < timeout:
        m = sorted(COMFY_OUTPUT.glob(f"{prefix}*.png"), key=lambda p: p.stat().st_mtime)
        if m and m[-1].stat().st_mtime > seen:
            time.sleep(2)
            return m[-1]
        time.sleep(4)
    raise TimeoutError(f"Timeout waiting for {prefix}*.png")


def main():
    if not gpu_ampel.acquire("belegbot-icon-flux"):
        print("AMPEL nicht gruen — Abbruch.")
        sys.exit(1)
    try:
        print("Queue FLUX-Icon …")
        queue(build_workflow())
        print("Warte auf Render …")
        png = wait_for_file(PREFIX)
        print("Fertig:", png)
        img = Image.open(png).convert("RGB")
        OUT.mkdir(parents=True, exist_ok=True)
        img.save(OUT / "icon-flux-preview.png")
        img.resize((512, 512), Image.LANCZOS).save(OUT / "icon-flux-512.png")
        print("geschrieben:", OUT / "icon-flux-preview.png")
    finally:
        gpu_ampel.release()


if __name__ == "__main__":
    main()
