import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const STATS_FILE = join(process.cwd(), 'data', 'stats.json')

function readStats(): Record<string, any> {
  if (!existsSync(STATS_FILE)) return {}
  try { return JSON.parse(readFileSync(STATS_FILE, 'utf-8')) } catch { return {} }
}

function parseInstantlyCSV(csv: string) {
  const lines = csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const sentIdx = headers.indexOf('sent')
  const openedIdx = headers.indexOf('unique opened')
  const repliedIdx = headers.indexOf('replied')

  if (sentIdx === -1) return null

  let totalSent = 0, totalOpened = 0, totalReplied = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    totalSent += parseInt(cols[sentIdx] || '0', 10) || 0
    if (openedIdx !== -1) totalOpened += parseInt(cols[openedIdx] || '0', 10) || 0
    if (repliedIdx !== -1) totalReplied += parseInt(cols[repliedIdx] || '0', 10) || 0
  }

  const openRate = totalSent > 0 ? +((totalOpened / totalSent) * 100).toFixed(1) : 0
  const replyRate = totalSent > 0 ? +((totalReplied / totalSent) * 100).toFixed(1) : 0

  return { sent: totalSent, opened: totalOpened, replied: totalReplied, openRate, replyRate }
}

export async function GET() {
  return NextResponse.json(readStats())
}

export async function POST(req: NextRequest) {
  try {
    const { campaignId, campaignName, csvText } = await req.json()
    if (!csvText) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

    const parsed = parseInstantlyCSV(csvText)
    if (!parsed) return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })

    const stats = readStats()
    const key = campaignId || campaignName
    stats[key] = { ...parsed, campaignId, campaignName, updatedAt: new Date().toISOString() }

    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2))
    return NextResponse.json({ ok: true, stats: stats[key] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
