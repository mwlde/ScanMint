'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home, Clock, Bookmark, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/',         Icon: Home,     label: 'Home'     },
  { path: '/history',  Icon: Clock,    label: 'History'  },
  { path: '/saved',    Icon: Bookmark, label: 'Saved'    },
  { path: '/settings', Icon: Settings, label: 'Settings' },
] as const

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <>
      {/* Spacer that reserves the same height as the fixed nav so content isn't clipped */}
      <div aria-hidden style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', flexShrink: 0 }} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 pt-3 border-t"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'white' }}
      >
      {NAV_ITEMS.map(({ path, Icon, label }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            className="flex flex-col items-center gap-1 py-1 min-w-[60px]"
          >
            <Icon size={22} style={{ color: active ? '#2D7DD2' : '#BBBBBB' }} strokeWidth={active ? 2.5 : 1.75} />
            <span className="text-xs font-medium" style={{ color: active ? '#2D7DD2' : '#BBBBBB' }}>{label}</span>
          </button>
        )
      })}
      </nav>
    </>
  )
}
