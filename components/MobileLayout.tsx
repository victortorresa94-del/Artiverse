'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-2)' }}
        >
          <Menu size={19} />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Artiverse</span>
          <Image src="/artiverse-logo.jpg" alt="Artiverse" width={26} height={26} className="rounded-md" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div
            className="relative w-64 h-full flex flex-col slide-in-left"
            style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2.5">
                <Image src="/artiverse-logo.jpg" alt="Artiverse" width={26} height={26} className="rounded-md" />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Artiverse</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-2)' }}
              >
                <X size={17} />
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)} className="flex-1 overflow-y-auto">
              <Sidebar mobile />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:mt-0 mt-14">
        {children}
      </main>
    </div>
  )
}
