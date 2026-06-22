'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ZapIcon } from 'lucide-react'

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotation = { tl: 0, tr: 90, bl: 270, br: 180 }[position]
  return (
    <svg
      width="36" height="36" viewBox="0 0 36 36" fill="none"
      style={{
        position: 'absolute',
        ...(position.includes('r') ? { right: 0 } : { left: 0 }),
        ...(position.includes('b') ? { bottom: 0 } : { top: 0 }),
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <path
        d="M2 20 L2 4 Q2 2 4 2 L20 2"
        stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
      />
    </svg>
  )
}

export default function CameraPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const hasStarted = useRef(false)
  const [ready, setReady] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play()
            setReady(true)
          }
        }
      })
      .catch(() => setError('Camera access denied. Please allow camera permission and try again.'))

    return () => stop()
  }, [stop])

  // Pulse animation for corner brackets
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => setPulse(p => !p), 800)
    return () => clearInterval(id)
  }, [ready])

  function capture() {
    const video = videoRef.current
    const canvas = captureRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    sessionStorage.setItem('ss_image', dataUrl)
    stop()
    router.push('/processing')
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-black gap-4 px-8 text-center">
        <p className="text-white/70 text-sm">{error}</p>
        <button onClick={() => router.push('/')} className="text-sm font-semibold" style={{ color: '#2D7DD2' }}>
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col overflow-hidden" style={{ minHeight: '100dvh', backgroundColor: '#111' }}>
      {/* Live video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.72) 100%)' }}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={captureRef} className="hidden" />

      {/* UI chrome */}
      <div className="relative z-10 flex flex-col" style={{ minHeight: '100dvh' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button
            onClick={() => { stop(); router.push('/') }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <X size={20} color="white" />
          </button>
          <div
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.85)' }}
          >
            Tap to capture
          </div>
          <div className="w-10" />
        </div>

        {/* Document frame */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-xs font-medium mb-4 tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Align document within frame
          </p>

          {/* Corner bracket frame */}
          <div className="relative" style={{ width: '74%', aspectRatio: '0.707 / 1' }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
              <div
                key={pos}
                style={{
                  position: 'absolute',
                  ...(pos.includes('r') ? { right: 0 } : { left: 0 }),
                  ...(pos.includes('b') ? { bottom: 0 } : { top: 0 }),
                  opacity: pulse ? 1 : 0.55,
                  transition: 'opacity 0.7s ease-in-out',
                  filter: pulse ? 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' : 'none',
                }}
              >
                <CornerBracket position={pos} />
              </div>
            ))}
            <div
              className="absolute inset-0 rounded-sm"
              style={{ border: '1px solid rgba(255,255,255,0.18)' }}
            />
          </div>

          <p className="text-xs mt-4 text-center" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '200px' }}>
            Hold steady, then tap the button to capture.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-center pb-12 pt-4 gap-10">
          <div className="w-10 h-10" />

          {/* Capture button */}
          <button
            onClick={capture}
            disabled={!ready}
            className="relative flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid white' }}
          >
            <div className="rounded-full" style={{ width: '58px', height: '58px', backgroundColor: 'white' }} />
          </button>

          {/* Flash placeholder */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <ZapIcon size={18} color="white" />
          </div>
        </div>
      </div>
    </div>
  )
}
