import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Artiverse Control',
    short_name: 'Artiverse',
    description: 'Dashboard de outreach y micro-CRM para Artiverse',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07070F',
    theme_color: '#2563EB',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
