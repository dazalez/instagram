import { Request, Response } from "express"
const corsAnywhere = require("cors-anywhere")

// cors-anywhere echoes the full target URL in these response headers. Instagram
// media URLs are ~1.2 KB, and the 302 that Instagram returns to browser user
// agents makes it emit a second copy, pushing the header block past the default
// nginx `proxy_buffer_size` (4 KB). The ingress then answers 502 and the media
// never reaches the browser. Nothing reads these headers, so drop them.
const isNoisyHeader = (name: string) =>
  name === "x-request-url" ||
  name === "x-final-url" ||
  name.startsWith("x-cors-redirect-")

export class CorsController {
  private static proxyServer = corsAnywhere.createServer({
    originWhitelist: [], // Allow all origins
    requireHeaders: [], // Do not require any headers.
    removeHeaders: [], // Do not remove any headers.
  })

  public static cors = async (req: Request, res: Response) => {
    req.url = req.url.replace("/api/cors/", "/")

    const setHeader = res.setHeader.bind(res)
    res.setHeader = ((name: string, value: any) => {
      if (isNoisyHeader(String(name).toLowerCase())) return res
      return setHeader(name, value)
    }) as Response["setHeader"]

    CorsController.proxyServer.emit("request", req, res)
  }
}
