'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

export default function HomePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dogeMode, setDogeMode] = useState(false)

  useEffect(() => {
    setDogeMode(localStorage.getItem('ss_doge_mode') === 'true')
    function onStorage(e: StorageEvent) {
      if (e.key === 'ss_doge_mode') setDogeMode(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
        <img
          src={dogeMode ? '/scanmintlogo2.png' : '/logo3.png'}
          alt="ScanMint logo"
          className="transition-all duration-300"
          style={{ width: 160, height: 160, objectFit: 'contain' }}
        />
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
          {dogeMode ? 'SmartWoof' : 'ScanMint'}
        </h1>
        <p className="text-center text-sm leading-relaxed mt-1" style={{ color: '#888888', maxWidth: '260px' }}>
          {dogeMode
            ? <>Sniff, align, and classify your documents instantly. Good boy! <img src="/bone.png" alt="bone" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} /></>
            : 'Detect, align, and classify your documents instantly.'}
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
          {dogeMode ? <>Sniff with Camera <img src="/sidedog.png" alt="dog" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'Scan with Camera'}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-semibold text-base transition-all active:scale-95 border-2"
          style={{ borderColor: '#2D7DD2', color: '#2D7DD2' }}
        >
          <Upload size={20} />
          {dogeMode ? <>Fetch Image <img src="/tennsiball.png" alt="ball" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'Upload Image'}
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
