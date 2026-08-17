"""
Genera una fuente de un solo glifo: el carácter de enmascarado de contraseña
(U+2022 BULLET, y sus variantes) dibujado como una vaca.

El navegador dibuja las contraseñas con el bullet usando la fuente del campo,
así que sustituyendo ese glifo la máscara se convierte en vaquitas sin tocar
el valor real del input.
"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPEM = 1000

def rect(pen, x1, y1, x2, y2):
    """Contorno rectangular en sentido horario."""
    pen.moveTo((x1, y1))
    pen.lineTo((x1, y2))
    pen.lineTo((x2, y2))
    pen.lineTo((x2, y1))
    pen.closePath()

def poly(pen, puntos):
    pen.moveTo(puntos[0])
    for p in puntos[1:]:
        pen.lineTo(p)
    pen.closePath()

def vaca():
    """
    Silueta de perfil, mirando a la izquierda. Contornos separados en el mismo
    sentido: con relleno non-zero se funden en una sola mancha.
    Caja útil: x 40..660, y 40..470. Se apoya sobre la línea base + 40.
    """
    pen = TTGlyphPen(None)

    # cuerpo
    rect(pen, 150, 170, 580, 400)
    # cuello y cabeza
    poly(pen, [(150, 200), (150, 380), (90, 355), (55, 300), (55, 205), (95, 180)])
    # hocico
    rect(pen, 30, 205, 70, 285)
    # oreja
    poly(pen, [(120, 370), (95, 440), (155, 400)])
    # cuerno
    poly(pen, [(150, 385), (185, 465), (205, 400)])
    # lomo redondeado (bulto sobre el cuerpo)
    poly(pen, [(200, 390), (300, 430), (470, 430), (570, 390)])
    # patas delanteras
    rect(pen, 175, 40, 235, 190)
    rect(pen, 255, 40, 315, 190)
    # patas traseras
    rect(pen, 420, 40, 480, 190)
    rect(pen, 500, 40, 560, 190)
    # pezuñas (un poco más anchas)
    rect(pen, 165, 40, 245, 75)
    rect(pen, 245, 40, 325, 75)
    rect(pen, 410, 40, 490, 75)
    rect(pen, 490, 40, 570, 75)
    # cola
    poly(pen, [(580, 390), (625, 400), (655, 300), (630, 195), (600, 200), (620, 300), (595, 355)])
    # borla de la cola
    rect(pen, 590, 150, 640, 205)

    return pen.glyph()

def construir(ruta_woff2):
    # El navegador usa U+2022; se mapean también variantes por si acaso.
    codigos = [0x2022, 0x25CF, 0x25CB, 0x2219, 0x00B7, 0x26AB, 0x2981]
    nombres = [".notdef", "vaca", "space"]

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(nombres)
    fb.setupCharacterMap({c: "vaca" for c in codigos} | {0x0020: "space"})

    vacio = TTGlyphPen(None).glyph()
    fb.setupGlyf({".notdef": vacio, "vaca": vaca(), "space": vacio})

    avance = 760  # deja aire entre vaquitas
    fb.setupHorizontalMetrics({
        ".notdef": (avance, 0), "vaca": (avance, 30), "space": (avance, 0),
    })
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({
        "familyName": "RanchOps Vaquitas",
        "styleName": "Regular",
        "psName": "RanchOpsVaquitas-Regular",
        "version": "1.0",
    })
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()

    fb.font.flavor = "woff2"
    fb.save(ruta_woff2)
    print("escrito:", ruta_woff2)

if __name__ == "__main__":
    import sys
    construir(sys.argv[1])
