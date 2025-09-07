import express from 'express'
import minimist from 'minimist'
import { getZillowCookie, saveZillowCookie } from './cookie.js'
import { launchBrowser, closeBrowser, getBrowser, shutdownBrowser, openBrowser } from './browser.js'

export function runBrowserServer() {
  const app = express()
  const host = process.env.HOST ?? '127.0.0.1'
  const port = process.env.PORT ?? 8082
  app.use(express.json())

  const args = minimist(process.argv.slice(2))
  const debug = args.debug

  const server = app.listen(8082, async () => {
    await launchBrowser()
    const connecting = setInterval(async () => {
      const browser = await getBrowser()
      if (browser?.connected) {
        clearInterval(connecting)
        if (debug) {
          console.log(`Browser listening at 127.0.0.1:9222`)
        }
        await saveZillowCookie()
      }
    }, 1000)
    if (debug) {
      console.log(`Server listening at ${host}:${port}`)
    }
  })

  const shutdownServer = () => {
    server.close(async (err) => {
      const browser = await shutdownBrowser()
      if (debug) {
        console.log(browser)
        console.log('server closed')
      }
      process.exit(err ? 1 : 0)
    })
    return { status: 'shutdown' }
  }

  app.get('/server', (_req, res) => {
    try {
      res.send({ running: true })
    } catch (error) {
      res.send(error)
    }
  })

  app.post('/browser/launch', async (_req, res) => {
    try {
      const browser = await launchBrowser()
      res.send({ browser })
    } catch (error) {
      res.send(error)
    }
  })

  app.post('/browser/open', async (req, res) => {
    try {
      const { url } = req?.body ?? {}
      const browser = await openBrowser(url)
      res.send({ browser })
    } catch (error) {
      res.send(error)
    }
  })

  app.get('/cookie', async (_req, res) => {
    try {
      const cookie = await getZillowCookie()
      res.send({ cookie })
    } catch (error) {
      res.send(error)
    }
  })

  app.get('/cookie/save', async (_req, res) => {
    try {
      const cookie = await saveZillowCookie()
      res.send({ cookie })
    } catch (error) {
      res.send(error)
    }
  })

  app.post('/browser/close', async (_req, res) => {
    try {
      const browser = await closeBrowser()
      res.send({ browser })
    } catch (error) {
      res.send(error)
    }
  })

  app.post('/server/shutdown', (_req, res) => {
    try {
      const server = shutdownServer()
      res.send({ server })
    } catch (error) {
      res.send(error)
    }
  })

  process.on('SIGINT', shutdownServer)
  process.on('SIGTERM', shutdownServer)

  return app
}
