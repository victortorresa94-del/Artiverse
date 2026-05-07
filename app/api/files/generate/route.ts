/**
 * POST /api/files/generate
 *
 * Genera una imagen con fal.ai (Flux Schnell) según prompt y la guarda en
 * Vercel Blob para tener URL permanente.
 *
 * Body: { prompt: string, aspect?: '16:9'|'1:1'|'4:3'|'9:16' }
 * Devuelve: { url, prompt, blobUrl }
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FAL_KEY    = process.env.VITE_FAL_KEY || process.env.FAL_KEY || ''
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

const ASPECT_MAP: Record<string, string> = {
  '16:9': 'landscape_16_9',
  '4:3':  'landscape_4_3',
  '1:1':  'square_hd',
  '9:16': 'portrait_16_9',
}

export async function POST(req: NextRequest) {
  if (!FAL_KEY) return NextResponse.json({ error: 'fal.ai key no configurada (VITE_FAL_KEY)' }, { status: 500 })

  const { prompt, aspect } = await req.json()
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt requerido' }, { status: 400 })
  }

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_size:  ASPECT_MAP[aspect || '16:9'] || 'landscape_16_9',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
    })
    if (!falRes.ok) {
      const t = await falRes.text()
      throw new Error(`fal.ai ${falRes.status}: ${t.slice(0, 200)}`)
    }
    const data = await falRes.json()
    const imgUrl = data.images?.[0]?.url
    if (!imgUrl) throw new Error('fal.ai no devolvió URL')

    // Si tenemos Blob → guardar permanentemente
    if (BLOB_TOKEN) {
      try {
        const imgRes = await fetch(imgUrl)
        const buf    = await imgRes.arrayBuffer()
        const { put } = await import('@vercel/blob')
        const slug   = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
        const result = await put(`generated/${slug || 'image'}.jpg`, buf, {
          access:           'public',
          addRandomSuffix:  true,
          token:            BLOB_TOKEN,
          contentType:      'image/jpeg',
        })
        return NextResponse.json({
          url:      result.url,
          blobUrl:  result.url,
          falUrl:   imgUrl,
          prompt,
        })
      } catch (e: any) {
        // Si falla el Blob, devolvemos la URL fal.ai (puede expirar)
        return NextResponse.json({
          url:    imgUrl,
          falUrl: imgUrl,
          prompt,
          warning: `Blob no disponible (${e.message}). URL puede expirar.`,
        })
      }
    }

    return NextResponse.json({
      url:    imgUrl,
      falUrl: imgUrl,
      prompt,
      warning: 'Vercel Blob no configurado. URL puede expirar.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
