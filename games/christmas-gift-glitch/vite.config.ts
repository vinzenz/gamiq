import { defineConfig } from 'vite'

export default defineConfig({
  // Bind to all interfaces so the game can be opened from a phone or tablet on your LAN.
  server: { host: true },
  // `base` is passed by the root build script (`pnpm build` → --base /<repo>/<game>/).
})
