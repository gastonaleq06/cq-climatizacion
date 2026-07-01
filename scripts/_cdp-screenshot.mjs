// Script temporal de verificación visual — usa CDP puro (WebSocket nativo de Node,
// sin dependencias nuevas) para navegar a la página de prueba y capturar screenshots.
import fs from 'node:fs'

const CDP_HTTP = 'http://localhost:9333'
const TARGET_URL = 'http://localhost:3000/test-pdf-paginacion'
const OUT_DIR = 'C:/tmp/cdp-shots'

fs.mkdirSync(OUT_DIR, { recursive: true })

function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function main() {
  const newTab = await fetch(`${CDP_HTTP}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  const ws = new WebSocket(newTab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })

  let id = 1
  const next = () => id++

  const consoleMsgs = []
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMsgs.push(msg.params.args.map(a => a.value ?? a.description).join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleMsgs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception))
    }
  })

  await send(ws, next(), 'Runtime.enable')
  await send(ws, next(), 'Page.enable')
  await send(ws, next(), 'Network.enable')

  // Cookie dummy de sesión: src/proxy.js (middleware de Next 16) solo verifica
  // que la cookie exista, no valida el JWT. Con esto evitamos loguearnos de
  // verdad solo para probar un componente de renderizado puro (PlantillaPDF).
  await send(ws, next(), 'Network.setCookie', {
    name: 'sb-dizhjuhogcfjljofduej-auth-token',
    value: 'dummy-para-test-visual',
    domain: 'localhost',
    path: '/',
  })

  await send(ws, next(), 'Page.navigate', { url: TARGET_URL })

  await new Promise((resolve) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', onMsg)
        resolve()
      }
    }
    ws.addEventListener('message', onMsg)
  })

  // Dar tiempo a los efectos de React (medición + paginación) y a fuentes/imágenes.
  await new Promise(r => setTimeout(r, 1500))

  const metrics = await send(ws, next(), 'Page.getLayoutMetrics')
  const fullHeight = Math.ceil(metrics.cssContentSize.height)
  const fullWidth = Math.ceil(metrics.cssContentSize.width)

  await send(ws, next(), 'Emulation.setDeviceMetricsOverride', {
    width: fullWidth,
    height: fullHeight,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await new Promise(r => setTimeout(r, 300))

  const shot = await send(ws, next(), 'Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: fullWidth, height: fullHeight, scale: 1 },
    captureBeyondViewport: true,
  })

  const outPath = `${OUT_DIR}/full.png`
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'))
  console.log('Screenshot guardado en', outPath, 'tamaño', fullWidth, 'x', fullHeight)

  const evalResult = await send(ws, next(), 'Runtime.evaluate', {
    expression: `
      (function() {
        const nodes = [...document.querySelectorAll('body *')];
        const paginasEconomicas = nodes.filter(el => el.textContent.trim() === 'Propuesta Económica').length;
        const exclusiones = nodes.some(el => el.textContent.trim() === 'Exclusiones');
        const condiciones = nodes.some(el => el.textContent.trim() === 'Condiciones Comerciales');
        const url = window.location.href;
        return JSON.stringify({ url, paginasEconomicas, exclusionesPresente: exclusiones, condicionesPresente: condiciones });
      })()
    `,
    returnByValue: true,
  })
  console.log('Resultado evaluación DOM:', evalResult.result.value)
  console.log('---CONSOLE MSGS---')
  console.log(consoleMsgs.join('\n'))

  ws.close()
}

main().catch(err => { console.error(err); process.exit(1) })
