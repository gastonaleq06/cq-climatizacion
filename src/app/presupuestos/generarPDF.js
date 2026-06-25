import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import PlantillaPDF from './PlantillaPDF'

const patchClone = (clonedDoc) => {
  clonedDoc.querySelectorAll('style').forEach(el => {
    el.textContent = el.textContent
      .replace(/oklch\([^)]+\)/g, '#000000')
      .replace(/\blab\([^)]+\)/g, '#000000')
  })
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove())
}

export async function descargarPDF(presupuestoData) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  const root = createRoot(container)

  // Renderizar off-screen y esperar dos frames para asegurar paint completo
  await new Promise(resolve => {
    root.render(createElement(PlantillaPDF, { presupuesto: presupuestoData }))
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })

  try {
    const el = container.firstChild
    if (!el) throw new Error('No se pudo renderizar la plantilla')

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const paginas = [...el.children]
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW = 210

    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: patchClone,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const imgH = (canvas.height / canvas.width) * pdfW
      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, imgH)
    }

    const nombre = (presupuestoData.cliente || 'borrador').replace(/[^a-zA-Z0-9]/g, '_')
    pdf.save(`cotizacion_${nombre}.pdf`)
  } finally {
    root.unmount()
    container.remove()
  }
}
