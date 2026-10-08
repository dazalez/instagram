import { spawn } from "child_process"
import { promisify } from "util"

const spawnAsync = promisify(spawn as any)

export interface InstagrapiResponse {
  status: number
  body: any
}

const baseUrl = () =>
  process.env.INSTAGRAPI_REST_URL ||
  "http://localhost:8000"

type QueryValue = string | number | undefined | Array<string | number>

export const callInstagrapi = async <T = any>(
  path: string,
  options: {
    method?: string
    session?: string
    query?: Record<string, QueryValue>
    form?: Record<string, string | number | undefined>
  } = {},
): Promise<InstagrapiResponse> => {
  const url = new URL(path, baseUrl())
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value === undefined) return
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)))
    } else {
      url.searchParams.set(key, String(value))
    }
  })

  const headers: Record<string, string> = {}
  if (options.session) headers["X-Session-ID"] = options.session

  let body: URLSearchParams | undefined
  if (options.form) {
    body = new URLSearchParams()
    Object.entries(options.form).forEach(([key, value]) => {
      if (value !== undefined) body!.set(key, String(value))
    })
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  try {
    const response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers,
      body,
    })
    const text = await response.text()
    let responseBody: any = text
    try {
      responseBody = text ? JSON.parse(text) : null
    } catch {
      // Keep non-JSON API error bodies available for diagnosis.
    }
    return { status: response.status, body: responseBody as T }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "cause" in error &&
      (error as any).cause?.code === "ENOTFOUND" &&
      process.env.INSTAGRAPI_REST_PYTHON_FALLBACK !== "false"
    ) {
      return callInstagrapiThroughPython<T>(path, options)
    }
    throw error
  }
}

const callInstagrapiThroughPython = async <T>(
  path: string,
  options: {
    method?: string
    session?: string
    query?: Record<string, QueryValue>
    form?: Record<string, string | number | undefined>
  },
): Promise<InstagrapiResponse> => {
  const script = [
    "import json, os, sys, urllib.error, urllib.parse, urllib.request",
    "payload = json.load(sys.stdin)",
    "url = urllib.parse.urljoin(payload['base_url'].rstrip('/') + '/', payload['path'].lstrip('/'))",
    "query = urllib.parse.urlencode({k: v for k, v in payload.get('query', {}).items() if v is not None}, doseq=True)",
    "url += ('&' if '?' in url else '?') + query if query else ''",
    "headers = {'X-Session-ID': payload['session']} if payload.get('session') else {}",
    "form = payload.get('form')",
    "data = urllib.parse.urlencode({k: v for k, v in form.items() if v is not None}).encode() if form is not None else None",
    "headers['Content-Type'] = 'application/x-www-form-urlencoded' if data is not None else headers.get('Content-Type', '')",
    "request = urllib.request.Request(url, data=data, headers=headers, method=payload.get('method', 'GET'))",
    "try:",
    " response = urllib.request.urlopen(request, timeout=60)",
    " status, text = response.status, response.read().decode()",
    "except urllib.error.HTTPError as error:",
    " status, text = error.code, error.read().decode()",
    "try:",
    " body = json.loads(text) if text else None",
    "except json.JSONDecodeError:",
    " body = text",
    "print(json.dumps({'status': status, 'body': body}))",
  ].join("\n")

  const python = process.env.PYTHON || "python"
  const child = await spawnAsync(python, ["-c", script], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  })
  const input = JSON.stringify({
    base_url: baseUrl(),
    path,
    ...options,
  })
  child.stdin.end(input)
  const output = await new Promise<string>((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
    child.on("error", reject)
    child.on("close", (code: number) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `Python exited with code ${code}`))
    })
  })
  return JSON.parse(output) as InstagrapiResponse
}
