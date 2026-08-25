#!/usr/bin/env python3
"""Genera el banner de Android TV (320×180) exigido por el lanzador leanback.

Sin android:banner la app no aparece en la fila de inicio del televisor.
El banner lleva el nombre porque leanback no muestra etiqueta de texto debajo.

Uso: python3 tools/make_tv_banner.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ANCHO, ALTO = 320, 180
FONDO_INI = (0x07, 0x0B, 0x14)
FONDO_FIN = (0x0E, 0x2A, 0x3A)
BLANCO = (0xF1, 0xF5, 0xF9)
ACENTO = (0x38, 0xBD, 0xF8)

# Fuente 5×7. Letras de IPTVNATOR.
FUENTE = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "V": ("10001", "10001", "10001", "10001", "10001", "01010", "00100"),
    " ": ("00000",) * 7,
}


def pintar_texto(pixeles, texto, x0, y0, escala, color):
    for i, ch in enumerate(texto):
        glifo = FUENTE.get(ch)
        if not glifo:
            continue
        base = x0 + i * 6 * escala
        for fy, fila in enumerate(glifo):
            for fx, bit in enumerate(fila):
                if bit != "1":
                    continue
                for dy in range(escala):
                    for dx in range(escala):
                        x, y = base + fx * escala + dx, y0 + fy * escala + dy
                        if 0 <= x < ANCHO and 0 <= y < ALTO:
                            pixeles[y][x] = color


def escribir_png(ruta: Path, filas, ancho, alto) -> int:
    cruda = b"".join(b"\x00" + f for f in filas)

    def trozo(tipo, datos):
        c = struct.pack(">I", len(datos)) + tipo + datos
        return c + struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += trozo(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 6, 0, 0, 0))
    png += trozo(b"IDAT", zlib.compress(cruda, 9))
    png += trozo(b"IEND", b"")
    ruta.write_bytes(png)
    return len(png)


def main():
    pixeles = [[None] * ANCHO for _ in range(ALTO)]
    for y in range(ALTO):
        for x in range(ANCHO):
            t = (x / ANCHO + y / ALTO) / 2
            pixeles[y][x] = tuple(
                round(FONDO_INI[i] + (FONDO_FIN[i] - FONDO_INI[i]) * t) for i in range(3)
            )

    # Marca de acento a la izquierda (no copia el logo de InfiniTV).
    for y in range(36, 144):
        for x in range(18, 28):
            pixeles[y][x] = ACENTO

    pintar_texto(pixeles, "IPTVNATOR", 48, 58, 4, BLANCO)
    pintar_texto(pixeles, "TV", 48, 106, 3, ACENTO)

    filas = [bytes(b for px in fila for b in (px[0], px[1], px[2], 255)) for fila in pixeles]
    destino = RAIZ / "native" / "android-config"
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / "tv_banner.png"
    n = escribir_png(ruta, filas, ANCHO, ALTO)
    print(f"  tv_banner.png: {ANCHO}x{ALTO}, {n} bytes")


if __name__ == "__main__":
    main()
