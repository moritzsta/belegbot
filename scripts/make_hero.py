# -*- coding: utf-8 -*-
"""belegbot Hero-Bild — FLUX text2img (Recipe 1). GELB-Job mit GPU-Ampel-Lock."""
import json, sys, time, urllib.request
from pathlib import Path
from PIL import Image

PIPE = Path(r"F:\WebApps\KI Video Generierung")
sys.path.insert(0, str(PIPE / "scripts"))
import gpu_ampel  # noqa

COMFY_URL = "http://127.0.0.1:8188"
COMFY_OUTPUT = Path(r"F:\ComfyUI\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\output")
OUT = Path(r"F:\WebApps\belegbot\public\brand")

PREFIX = "belegbot_hero"
W, H = 1344, 768          # native (Recipe 1) → Lanczos 1920x1080
FINAL = (1920, 1080)
STEPS, GUIDANCE, SEED = 32, 3.5, 77123

PROMPT = (
    "Abstract premium fintech hero visualization, deep near-black background (#0D0F14). "
    "Several elegant translucent paper receipts and thin payment slips floating and gently "
    "curving through dark space, layered at different depths with soft shallow depth of field. "
    "Warm amber glow (#E8A838) as the primary key light rimming the floating receipts, a cool "
    "teal accent light (#3FC9C0) as secondary rim from the opposite side. Faint technical grid "
    "and subtle data lines dissolving into the deep background, minimal glowing UI particles and "
    "light dust suggesting automatic data extraction and scanning. Cinematic volumetric haze, "
    "rich deep blacks, generous negative space, refined and modern. High-end 3D product "
    "visualization, octane render, editorial tech aesthetic. No text, no logos, no readable characters."
)
NEGATIVE = ("text, watermark, logo, signature, readable characters, low quality, jpeg artifacts, "
            "oversaturated, neon, rainbow, cyberpunk cliche, bright daylight, white background, "
            "stock photo look, cluttered, busy composition, hdr halo")


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
    if not gpu_ampel.acquire("belegbot-hero"):
        print("AMPEL nicht grün — Abbruch.")
        sys.exit(1)
    try:
        print("Queue FLUX-Workflow …")
        queue(build_workflow())
        print("Warte auf Render (~150s) …")
        png = wait_for_file(PREFIX)
        print("Fertig:", png)
        img = Image.open(png).convert("RGB").resize(FINAL, Image.LANCZOS)
        OUT.mkdir(parents=True, exist_ok=True)
        img.save(OUT / "hero.png")
        img.save(OUT / "hero.jpg", quality=92)
        print("geschrieben:", OUT / "hero.png", "+ hero.jpg")
    finally:
        gpu_ampel.release()


if __name__ == "__main__":
    main()
