import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

interface SignOptions {
  pdfBuffer:       Buffer
  signatureBase64: string   // "data:image/png;base64,..." from canvas
  clientName:      string
  signedAt:        Date
}

export async function signPDF(opts: SignOptions): Promise<Uint8Array> {
  const { pdfBuffer, signatureBase64, clientName, signedAt } = opts

  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pages  = pdfDoc.getPages()
  const page   = pages[pages.length - 1]
  const { width, height } = page.getSize()

  // ── Extraer imagen PNG ──────────────────────────────────────────────
  const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '')
  const sigBytes   = Buffer.from(base64Data, 'base64')
  const sigImage   = await pdfDoc.embedPng(sigBytes)

  // ── Zona "Firma del Cliente" — más grande ───────────────────────────
  const sigZoneX = 38
  const sigZoneY = 88          // desde el fondo de la página
  const sigZoneW = Math.min(250, width * 0.42)   // antes: 180 / 0.32
  const sigZoneH = 90                             // antes: 55

  // Fondo blanco para tapar los puntitos del formulario
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

  // ── Imagen de la firma — más grande ────────────────────────────────
  const sigAspect = sigImage.width / sigImage.height
  const drawH     = Math.min(68, sigZoneH - 22)           // antes: 42
  const drawW     = Math.min(sigAspect * drawH, sigZoneW - 10)

  page.drawImage(sigImage, {
    x:      sigZoneX + 5,
    y:      sigZoneY + 20,     // desde abajo de la zona
    width:  drawW,
    height: drawH,
  })

  // ── Textos debajo de la firma ───────────────────────────────────────
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const green    = rgb(0.05, 0.45, 0.15)
  const gray     = rgb(0.3, 0.3, 0.3)
  const dark     = rgb(0.05, 0.05, 0.05)

  // Nombre del cliente — más grande
  const nameText = clientName.length > 36 ? clientName.substring(0, 34) + '...' : clientName
  page.drawText(nameText, {
    x: sigZoneX + 3, y: sigZoneY + 11,
    size: 8.5, font: fontBold, color: dark,   // antes: 7
  })

  // Fecha y hora
  const dateStr = signedAt.toLocaleDateString('es-AR') +
    ' ' + signedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  page.drawText(dateStr, {
    x: sigZoneX + 3, y: sigZoneY + 1,
    size: 7.5, font, color: gray,              // antes: 6
  })

  // Sello digital
  page.drawText('* FIRMADO DIGITALMENTE', {
    x: sigZoneX + 3, y: sigZoneY - 9,
    size: 7, font: fontBold, color: green,     // antes: 5.5
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
