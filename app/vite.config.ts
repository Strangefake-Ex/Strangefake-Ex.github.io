import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths"

const AI_ROUTES: Record<string, string> = {
  rewrite: './api/ai/rewrite.ts',
  prompt: './api/ai/prompt.ts',
  'explain-alert': './api/ai/explain-alert.ts',
  weave: './api/ai/weave.ts',
}

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const pathname = (req.url ?? '/').split('?')[0] ?? '/'
        const route = pathname.replace(/^\//, '').replace(/\/$/, '')
        const modulePath = AI_ROUTES[route]

        if (!modulePath) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: `Unknown AI endpoint: ${route}` }))
          return
        }

        try {
          const mod = await server.ssrLoadModule(modulePath)
          const handler = mod.default as (webReq: Request) => Promise<Response>

          const chunks: Uint8Array[] = []
          for await (const chunk of req) chunks.push(chunk)
          const body = Buffer.concat(chunks).toString()

          const webReq = new Request(`http://localhost/api/ai/${route}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: body || undefined,
          })

          const webRes = await handler(webReq)
          res.statusCode = webRes.status
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })
          const resBody = await webRes.text()
          res.end(resBody)
        } catch (err) {
          console.error(`[api-dev-middleware] ${route}:`, err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Internal Server Error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'DEEPSEEK_'])
  if (env.DEEPSEEK_API_KEY) {
    process.env.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY
  }

  return {
    build: {
      sourcemap: 'hidden',
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
    plugins: [
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths(),
      apiDevMiddleware(),
    ],
  }
})
