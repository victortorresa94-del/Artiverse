import { NextResponse } from 'next/server'
import { validateToken, getHubSpotLists, createStaticList } from '@/lib/hubspot'

export const dynamic = 'force-dynamic'

// GET /api/hubspot — test connection + fetch lists
export async function GET() {
  const status = await validateToken()
  if (!status.valid) {
    return NextResponse.json({ connected: false, error: status.error })
  }

  let lists: any[] = []
  try {
    const data = await getHubSpotLists()
    lists = (data.lists || []).map((l: any) => ({
      id: String(l.listId),
      name: l.name,
      count: l.metaData?.size || 0,
      type: l.dynamic ? 'smart' : 'static',
    }))
  } catch {
    // Non-critical — scopes may not include list read
  }

  return NextResponse.json({
    connected: true,
    portal: status.portal,
    lists,
  })
}

// POST /api/hubspot — create a list
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, emails } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const result = await createStaticList(name, emails || [])
  return NextResponse.json(result)
}
