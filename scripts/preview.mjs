#!/usr/bin/env node
/**
 * Serves dist/ so the built games can be tested from a phone or tablet on your
 * LAN: pnpm preview
 */
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { extname, join, normalize, resolve, sep } from 'node:path'

const rootDir = resolve(process.cwd(), process.argv[2] ?? 'dist')
const port = Number(process.env.PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const filePath = normalize(join(rootDir, decodeURIComponent(url.pathname)))
    if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    let info = await stat(filePath).catch(() => undefined)
    if (info?.isDirectory()) {
      const indexPath = join(filePath, 'index.html')
      info = await stat(indexPath).catch(() => undefined)
      if (info) {
        res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(await readFile(indexPath))
        return
      }
    }
    if (!info) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
      return
    }
    res
      .writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' })
      .end(await readFile(filePath))
  } catch {
    res.writeHead(500).end('Internal error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${rootDir}`)
  console.log(`  Local:   http://localhost:${port}/`)
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Network: http://${net.address}:${port}/`)
      }
    }
  }
})
