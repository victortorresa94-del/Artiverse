import { NextResponse } from 'next/server'
import { validateToken, getLists, createList, addContactsToList } from '@/lib/hubspot'

export const dynamic = 'force-dynamic'

// GET /api/hubspot — status + lists
export async function GET() {
  const status = await validateToken()
  if (!status.valid) {
    return NextResponse.json({ connected: false, error: status.error })
  }

  let lists: any[] = []
  try {
    lists = await getLists()
  } catch {
    // Non-critical
  }

  return NextResponse.json({
    connected: true,
    portal: status.portal,
    lists,
  })
}

// POST /api/hubspot
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { action, name, emails, listId } = body

  if (action === 'create-list') {
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result = await createList(name, emails || [])
    return NextResponse.json(result)
  }

  if (action === 'add-to-list') {
    if (!listId || !emails?.length) return NextResponse.json({ error: 'listId and emails required' }, { status: 400 })
    const result = await addContactsToList(listId, emails)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
