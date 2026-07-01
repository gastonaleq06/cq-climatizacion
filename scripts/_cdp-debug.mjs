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
  const newTab = await fetch(`${CDP_HTTP}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: 'PUT' }).then(r => r.json())
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
  await new Promise((resolve) => {
    const onMsg = (ev) => { const msg = JSON.parse(ev.data); if (msg.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); resolve() } }
    ws.addEventListener('message', onMsg)
  })
  await new Promise(r => setTimeout(r, 1500))

  const evalResult = await send(ws, next(), 'Runtime.evaluate', {
    expression: `document.body.innerText.slice(0, 2000)`,
    returnByValue: true,
  })
  console.log('---BODY TEXT (first 2000 chars)---')
  console.log(evalResult.result.value)
  console.log('---CONSOLE MSGS---')
  console.log(consoleMsgs.join('\n'))

  ws.close()
}
main().catch(e => { console.error(e); process.exit(1) })
