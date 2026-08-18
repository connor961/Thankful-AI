import type { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

// TEMPORARY dev-only bridge: lets the isolated browser sandbox hand rendered
// marketing PNGs back to the project filesystem. Safe to delete after use.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('disabled', { status: 403 })
  }
  const name = req.nextUrl.searchParams.get('name') ?? ''
  if (!/^[a-z0-9._-]+\.png$/i.test(name)) {
    return new Response('bad name', { status: 400 })
  }
  const buf = Buffer.from(await req.arrayBuffer())
  const dir = path.join(process.cwd(), 'public', 'marketing', 'round-2')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), buf)
  return Response.json({ ok: true, name, bytes: buf.length })
}
