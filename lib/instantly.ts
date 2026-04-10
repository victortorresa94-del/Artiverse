// Configuration settings for Instantly.ai and Hubspot bridges

export const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || "NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=="
export const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || "eu1-7d9f-f9b9-4333-a080-30c86a24a19b"

// Reusable Instantly fetch wrapper
export async function fetchInstantly(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`https://api.instantly.ai/api/v2${endpoint}`)
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))

    const res = await fetch(url.toString(), {
        headers: {
            "Authorization": `Bearer ${INSTANTLY_API_KEY}`,
            "Content-Type": "application/json"
        },
        next: { revalidate: 60 } // Next App Router caching strategy
    })

    if (!res.ok) {
        throw new Error(`Instantly API error: ${res.statusText}`)
    }

    return res.json()
}
