import fs from 'node:fs'
const CDP_HTTP = 'http://localhost:9333'
const TARGET_URL = 'http://localhost:3000/test-pdf-paginacion'

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
  await send(ws, next(), 'Runtime.enable')
  await send(ws, next(), 'Page.enable')
  await send(ws, next(), 'Network.enable')
  await send(ws, next(), 'Network.setCookie', { name: 'sb-dizhjuhogcfjljofduej-auth-token', value: 'dummy', domain: 'localhost', path: '/' })
  await send(ws, next(), 'Page.navigate', { url: TARGET_URL })
  await new Promise((resolve) => {
    const onMsg = (ev) => { const msg = JSON.parse(ev.data); if (msg.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); resolve() } }
    ws.addEventListener('message', onMsg)
  })
  await new Promise(r => setTimeout(r, 1500))

  const evalResult = await send(ws, next(), 'Runtime.evaluate', {
    expression: `
      (function() {
        const nodes = [...document.querySelectorAll('body *')];
        const rectOf = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) }; };
        const headers = nodes.filter(el => el.textContent.trim() === 'Propuesta Económica' && el.children.length === 0).map(rectOf);
        const exclusiones = nodes.filter(el => el.textContent.trim() === 'Exclusiones' && el.children.length === 0).map(rectOf);
        const condiciones = nodes.filter(el => el.textContent.trim() === 'Condiciones Comerciales' && el.children.length === 0).map(rectOf);
        // Altura y top de cada div de página (width 794, height 1123)
        const pageDivs = nodes.filter(el => el.getBoundingClientRect().width === 794 && el.getBoundingClientRect().height === 1123).map(rectOf);
        return JSON.stringify({ headers, exclusiones, condiciones, pageDivs }, null, 0);
      })()
    `,
    returnByValue: true,
  })
  console.log(evalResult.result.value)
  ws.close()
}
main().catch(e => { console.error(e); process.exit(1) })
