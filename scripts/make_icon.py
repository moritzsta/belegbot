"""belegbot App-Icon (512x512) — abgerundetes Amber-Quadrat + dunkles B, Syne 800."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 512
BG = (13, 15, 20)        # #0D0F14
AMBER = (232, 168, 56)   # #E8A838
AMBER_HI = (246, 190, 90)
INK = (13, 15, 20)
FONT = "scripts/fonts/Syne-VariableFont_wght.ttf"

img = Image.new("RGB", (S, S), BG)

# --- dezenter Hintergrund-Glow (Amber, weich) ---
glow = Image.new("RGB", (S, S), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse([S*0.12, S*0.12, S*0.88, S*0.88], fill=(60, 44, 18))
glow = glow.filter(ImageFilter.GaussianBlur(70))
img = Image.blend(img, glow, 0.9)

# --- abgerundetes Amber-Quadrat mit sanftem vertikalem Verlauf ---
pad = 58
box = [pad, pad, S - pad, S - pad]
radius = 120

# Verlauf amber -> heller oben
grad = Image.new("RGB", (S, S), AMBER)
gp = grad.load()
for y in range(S):
    t = y / S
    r = int(AMBER_HI[0] * (1 - t) + AMBER[0] * t)
    g = int(AMBER_HI[1] * (1 - t) + AMBER[1] * t)
    b = int(AMBER_HI[2] * (1 - t) + AMBER[2] * t)
    for x in range(S):
        gp[x, y] = (r, g, b)

mask = Image.new("L", (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle(box, radius=radius, fill=255)

# weicher Schlagschatten unter dem Quadrat
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle([pad, pad + 14, S - pad, S - pad + 14], radius=radius, fill=(0, 0, 0, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(24))
img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")

img.paste(grad, (0, 0), mask)

# --- dunkles "B" in Syne 800, zentriert ---
draw = ImageDraw.Draw(img)
font = ImageFont.truetype(FONT, 300)
try:
    font.set_variation_by_axes([800])
except Exception:
    pass
bbox = draw.textbbox((0, 0), "B", font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = (S - tw) / 2 - bbox[0]
ty = (S - th) / 2 - bbox[1] - 6
draw.text((tx, ty), "B", font=font, fill=INK)

img.save("public/brand/icon.png")
# zusaetzlich 192er fuer Favicons/kleine Verwendung
img.resize((192, 192), Image.LANCZOS).save("public/brand/icon-192.png")
print("icon.png + icon-192.png geschrieben")
