/**
 * GET  /api/files       — lista de imágenes/archivos en Vercel Blob
 * POST /api/files       — sube un archivo (multipart form-data, campo "file")
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

export async function GET() {
  if (!BLOB_TOKEN) {
    return NextResponse.json({
      files: [],
      error: 'Vercel Blob no configurado. En Vercel → Storage → Create Database → Blob → Connect.',
    })
  }
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ token: BLOB_TOKEN })
    return NextResponse.json({
      files: blobs.map(b => ({
        url:        b.url,
        pathname:   b.pathname,
        size:       b.size,
        uploadedAt: b.uploadedAt,
        contentType: (b as any).contentType,
      })).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, files: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!BLOB_TOKEN) {
    return NextResponse.json({ error: 'Vercel Blob no configurado (BLOB_READ_WRITE_TOKEN)' }, { status: 503 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Falta el archivo en campo "file"' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo demasiado grande (max 8MB)' }, { status: 400 })
    }

    const { put } = await import('@vercel/blob')
    const result = await put(file.name, file, {
      access:           'public',
      addRandomSuffix:  true,
      token:            BLOB_TOKEN,
    })

    return NextResponse.json({
      ok:        true,
      url:       result.url,
      pathname:  result.pathname,
      size:      file.size,
      contentType: file.type,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
