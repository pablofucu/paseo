"""Sintetiza los sonidos de la guía de sellos (§ 04 y § 07) en WAV.

- stamp.wav: «clac» (ruido blanco 0,18 s, caída cúbica, pasa-bajos 520 Hz,
  ganancia 0,9) + «pum» (seno 110 → 45 Hz en 0,12 s, ganancia 0,6 → 0,001 en 0,15 s).
- page.wav: ráfaga de ruido de 0,25 s con un pasa-banda que sube de 800 a 2.500 Hz, volumen bajo.

Uso: python3 scripts/make-sounds.py
"""
import math, random, struct, wave, os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
random.seed(7)

def biquad(x, coef_at):
    """Filtro biquad (RBJ) con coeficientes que pueden cambiar en cada muestra."""
    y = []; x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        b0, b1, b2, a0, a1, a2 = coef_at(i)
        out = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, v, y1, out
        y.append(out)
    return y

def lowpass(f, q=0.7071):
    w = 2 * math.pi * f / SR; a = math.sin(w) / (2 * q); c = math.cos(w)
    return ((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + a, -2 * c, 1 - a)

def bandpass(f, q=1.2):
    w = 2 * math.pi * f / SR; a = math.sin(w) / (2 * q); c = math.cos(w)
    return (a, 0, -a, 1 + a, -2 * c, 1 - a)

def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    k = min(1.0, 0.95 / peak)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * k)) * 32767)) for s in samples))

# Sello
n = int(SR * 0.18)
noise = [(random.random() * 2 - 1) * (1 - i / n) ** 3 for i in range(n)]
lp = lowpass(520)
clac = [0.9 * v for v in biquad(noise, lambda i: lp)]
m = int(SR * 0.16)
pum = []; ph = 0.0
for i in range(m):
    t = i / SR
    f = 110 * (45 / 110) ** min(1, t / 0.12)
    g = 0.6 * (0.001 / 0.6) ** min(1, t / 0.15)
    ph += 2 * math.pi * f / SR
    pum.append(g * math.sin(ph))
L = max(n, m) + int(SR * 0.02)
stamp = [(clac[i] if i < n else 0) + (pum[i] if i < m else 0) for i in range(L)]
write('stamp.wav', stamp)

# Hoja
n = int(SR * 0.25)
noise = [(random.random() * 2 - 1) for _ in range(n)]
env = [math.sin(math.pi * i / n) ** 1.5 for i in range(n)]
page = biquad([v * e for v, e in zip(noise, env)], lambda i: bandpass(800 * (2500 / 800) ** (i / n)))
peak = max(abs(v) for v in page)
write('page.wav', [0.35 * v / peak for v in page])
print('ok')
