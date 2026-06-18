'use client'

export const runtime = 'edge'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

const LogoIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect x="6" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
    <rect x="24" y="6" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
    <rect x="6" y="24" width="14" height="14" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
    <path d="M24 31 L38 31 M31 24 L31 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 22 L38 22" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
  </svg>
)

export default function HomePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      sessionStorage.setItem('ss_image', reader.result as string)
      router.push('/processing')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
      {/* iOS status bar spacer */}
      <div className="h-11 flex-shrink-0" />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#2D7DD2' }}
        >
          <LogoIcon />
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
          SmartScan
        </h1>
        <p className="text-center text-sm leading-relaxed mt-1" style={{ color: '#888888', maxWidth: '240px' }}>
          Detect, align, and classify your documents instantly.
        </p>
      </div>

      {/* Actions */}
      <div className="px-6 pb-4 flex flex-col gap-4">
        <button
          onClick={() => router.push('/camera')}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-semibold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: '#2D7DD2' }}
        >
          <Camera size={20} />
          Scan with Camera
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-semibold text-base transition-all active:scale-95 border-2"
          style={{ borderColor: '#2D7DD2', color: '#2D7DD2' }}
        >
          <Upload size={20} />
          Upload Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <BottomNav />
    </div>
  )
}
