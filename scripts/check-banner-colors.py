"""Cuenta cuánto de una portada es del color del tour: % de píxeles cuyo tono
está a menos de 30° del acento (o casi grises), y % de apoyo (otros tonos).

  python3 scripts/check-banner-colors.py <vista-previa.png> <acento, p. ej. #5f4dbd>
"""
import colorsys, sys
from PIL import Image

im = Image.open(sys.argv[1]).convert('RGB').crop((16, 16, 976, 616)).resize((240, 150))
acc = sys.argv[2].lstrip('#')
hue = colorsys.rgb_to_hls(*(int(acc[i:i + 2], 16) / 255 for i in (0, 2, 4)))[0] * 360
main = neutral = other = 0
for r, g, b in im.getdata():
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if s * min(l, 1 - l) * 2 < 0.06:
        neutral += 1
        continue
    hh = h * 360
    d = min(abs(hh - hue), 360 - abs(hh - hue))
    if d < 30: main += 1
    else: other += 1
n = main + neutral + other
print(f'acento {100*main/n:.0f}% · neutros {100*neutral/n:.0f}% · otros {100*other/n:.0f}%')
