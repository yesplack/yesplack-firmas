import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

interface SignOptions {
  pdfBuffer:       Buffer
  signatureBase64: string   // "data:image/png;base64,..." from canvas
  clientName:      string
  signedAt:        Date
  documentType?:   string   // 'price_list' | 'factura' | 'remito'
}

export async function signPDF(opts: SignOptions): Promise<Uint8Array> {
  const { pdfBuffer, signatureBase64, clientName, signedAt, documentType = 'price_list' } = opts

  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pages  = pdfDoc.getPages()
  const page   = pages[pages.length - 1]
  const { width, height } = page.getSize()

  // ── Extraer imagen PNG ──────────────────────────────────────────────
  const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '')
  const sigBytes   = Buffer.from(base64Data, 'base64')
  const sigImage   = await pdfDoc.embedPng(sigBytes)

  // ── Posición según tipo de documento ───────────────────────────────
  // Página A4 estándar = 595 x 842 pts (coordenadas pdf-lib: y=0 en el fondo)
  //
  // REMITO: zona "Recibí Conforme" está en la mitad derecha
  //   pdfplumber: "Recibí Conforme" top=586 → desde abajo = 842-586 = 256 pts
  //   "Aclaración de Firma"  top=612 → desde abajo = 842-612 = 230 pts
  //   La firma se pone encima de esas líneas, en la mitad derecha (x ≈ 295)
  //
  // FACTURA: no tiene zona de firma, la ponemos en esquina inferior derecha
  //   debajo del bloque de totales (último texto relevante ~y=680 desde arriba = 162 desde abajo)
  //
  // LISTA DE PRECIOS: esquina inferior izquierda (comportamiento original)

  let sigZoneX: number
  let sigZoneY: number
  let sigZoneW: number
  let sigZoneH: number

  if (documentType === 'remito') {
    // Mitad derecha, sobre la línea "Recibí Conforme"
    // "Recibí Conforme" está a 256 pts desde abajo — la zona arranca justo encima
    sigZoneX = 295          // mitad derecha de la página
    sigZoneY = 258          // justo sobre la línea "Recibí Conforme"
    sigZoneW = Math.min(270, width - 295 - 15)   // hasta el margen derecho
    sigZoneH = 90
  } else if (documentType === 'factura') {
    // Esquina inferior izquierda, debajo del bloque de horarios
    // Último texto importante ~y=755 desde arriba → 87 desde abajo; dejamos margen
    sigZoneX = 20
    sigZoneY = 20
    sigZoneW = Math.min(250, width * 0.42)
    sigZoneH = 70
  } else {
    // price_list — comportamiento original, esquina inferior izquierda
    sigZoneX = 38
    sigZoneY = 88
    sigZoneW = Math.min(250, width * 0.42)
    sigZoneH = 90
  }

  // Fondo blanco para tapar los puntitos/líneas del formulario
  page.drawRectangle({
    x:           sigZoneX - 2,
    y:           sigZoneY - 2,
    width:       sigZoneW + 4,
    height:      sigZoneH + 4,
    color:       rgb(1, 1, 1),
    opacity:     0.95,
    borderColor: rgb(0.1, 0.45, 0.2),
    borderWidth: 0.8,
  })

  // ── Imagen de la firma ──────────────────────────────────────────────
  const sigAspect = sigImage.width / sigImage.height
  const drawH     = Math.min(68, sigZoneH - 22)
  const drawW     = Math.min(sigAspect * drawH, sigZoneW - 10)

  page.drawImage(sigImage, {
    x:      sigZoneX + 5,
    y:      sigZoneY + 20,
    width:  drawW,
    height: drawH,
  })

  // ── Textos debajo de la firma ───────────────────────────────────────
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const green    = rgb(0.05, 0.45, 0.15)
  const gray     = rgb(0.3, 0.3, 0.3)
  const dark     = rgb(0.05, 0.05, 0.05)

  const nameText = clientName.length > 36 ? clientName.substring(0, 34) + '...' : clientName
  page.drawText(nameText, {
    x: sigZoneX + 3, y: sigZoneY + 11,
    size: 8.5, font: fontBold, color: dark,
  })

  const dateStr = signedAt.toLocaleDateString('es-AR') +
    ' ' + signedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  page.drawText(dateStr, {
    x: sigZoneX + 3, y: sigZoneY + 1,
    size: 7.5, font, color: gray,
  })

  page.drawText('* FIRMADO DIGITALMENTE', {
    x: sigZoneX + 3, y: sigZoneY - 9,
    size: 7, font: fontBold, color: green,
  })

  // ── Marca de agua diagonal ──────────────────────────────────────────
  page.drawText('FIRMADO', {
    x:       width / 2 - 60,
    y:       height / 2 - 15,
    size:    52,
    font:    fontBold,
    color:   rgb(0.05, 0.45, 0.15),
    opacity: 0.06,
    rotate:  degrees(35),
  })

  return pdfDoc.save()
}
