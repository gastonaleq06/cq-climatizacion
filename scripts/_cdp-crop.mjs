import fs from 'node:fs'
const CDP_HTTP = 'http://localhost:9333'
const TARGET_URL = 'http://localhost:3000/test-pdf-paginacion'
const Y_FROM = Number(process.argv[2] || 9113)
const Y_TO = Number(process.argv[3] || 10236)
const OUT = process.argv[4] || 'C:/tmp/cdp-shots/crop.png'

function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id === id) { ws.removeEventListener('message', onMsg); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function main() {
  const newTab = await fetch(`${CDP_HTTP}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  const ws = new WebSocket(newTab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
  let id = 1; const next = () => id++
  await send(ws, next(), 'Page.enable')
  await send(ws, next(), 'Network.enable')
  await send(ws, next(), 'Network.setCookie', { name: 'sb-dizhjuhogcfjljofduej-auth-token', value: 'dummy', domain: 'localhost', path: '/' })
  await send(ws, next(), 'Page.navigate', { url: TARGET_URL })
  await new Promise((resolve) => {
    const onMsg = (ev) => { const msg = JSON.parse(ev.data); if (msg.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); resolve() } }
    ws.addEventListener('message', onMsg)
  })
  await new Promise(r => setTimeout(r, 1500))
  await send(ws, next(), 'Emulation.setDeviceMetricsOverride', { width: 960, height: Y_TO, deviceScaleFactor: 1, mobile: false })
  await new Promise(r => setTimeout(r, 300))
  const shot = await send(ws, next(), 'Page.captureScreenshot', {
    format: 'png',
    clip: { x: 166, y: Y_FROM, width: 794, height: Y_TO - Y_FROM, scale: 1 },
    captureBeyondViewport: true,
  })
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
  console.log('Guardado', OUT)
  ws.close()
}
main().catch(e => { console.error(e); process.exit(1) })
