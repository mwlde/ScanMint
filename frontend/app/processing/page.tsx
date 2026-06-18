'use client'

export const runtime = 'edge'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'

type Status = 'pending' | 'active' | 'done' | 'error'

const STEPS = ['Enhance', 'Detect', 'Warp', 'Classify'] as const
type StepName = (typeof STEPS)[number]

const SCAN_API = process.env.NEXT_PUBLIC_SCAN_API
const CLASSIFY_API = process.env.NEXT_PUBLIC_CLASSIFY_API

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

export default function ProcessingPage() {
  const router = useRouter()
  const hasRun = useRef(false)

  const [thumb, setThumb] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<StepName, Status>>({
    Enhance: 'pending', Detect: 'pending', Warp: 'pending', Classify: 'pending',
  })
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function set(step: StepName, s: Status) {
    setStatuses(p => ({ ...p, [step]: s }))
  }

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const imageUrl = sessionStorage.getItem('ss_image')
    if (!imageUrl) { router.replace('/'); return }
    setThumb(imageUrl)

    // Elapsed timer
    const t0 = Date.now()
    const timer = setInterval(() => setElapsed(Date.now() - t0), 50)

    async function run() {
      try {
        // ── Step 1-3: POST /scan ─────────────────────────────────────────────
        set('Enhance', 'active')

        const imgResp = await fetch(imageUrl!)
        const blob = await imgResp.blob()
        const fd = new FormData()
        fd.append('file', blob, 'image.jpg')

        const scanResp = await fetch(`${SCAN_API}/scan`, { method: 'POST', body: fd })
        if (!scanResp.ok) throw new Error(`Scan API returned ${scanResp.status}`)
        const scanData = await scanResp.json()
        sessionStorage.setItem('ss_scan_result', JSON.stringify(scanData))

        set('Enhance', 'done'); await delay(120)
        set('Detect', 'done'); await delay(120)
        set('Warp', 'done'); await delay(120)

        // ── Step 4: POST /classify ───────────────────────────────────────────
        set('Classify', 'active')

        const warpedResp = await fetch(`data:image/png;base64,${scanData.warped}`)
        const warpedBlob = await warpedResp.blob()
        const cf = new FormData()
        cf.append('file', warpedBlob, 'warped.png')

        const classResp = await fetch(`${CLASSIFY_API}/classify`, { method: 'POST', body: cf })
        if (!classResp.ok) throw new Error(`Classify API returned ${classResp.status}`)
        const classData = await classResp.json()
        sessionStorage.setItem('ss_classify_result', JSON.stringify(classData))

        set('Classify', 'done')
        clearInterval(timer)
        await delay(350)
        router.push('/results')
      } catch (e: unknown) {
        clearInterval(timer)
        const msg = e instanceof Error ? e.message : 'Something went wrong'
        setError(msg)
        setStatuses(p => {
          const next = { ...p }
          for (const k of Object.keys(next) as StepName[]) {
            if (next[k] === 'active') next[k] = 'error'
          }
          return next
        })
      }
    }

    run()
    return () => clearInterval(timer)
  }, [router])

  const activeStep = STEPS.findIndex(s => statuses[s] === 'active')
  const doneCount = STEPS.filter(s => statuses[s] === 'done').length

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="h-11 flex-shrink-0" />

      {/* Thumbnail */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-lg"
          style={{ maxWidth: '260px', aspectRatio: '0.707 / 1', backgroundColor: '#F5F5F5' }}
        >
          {thumb ? (
            <img src={thumb} alt="Processing" className="w-full h-full object-cover" />
          ) : (
            // Placeholder lines matching Figma
            <div className="w-full h-full p-6 flex flex-col gap-3">
              <div className="w-3/5 h-4 rounded-full bg-[#D0D0D0]" />
              <div className="w-2/5 h-3 rounded-full bg-[#E0E0E0]" />
              <div className="mt-2 flex flex-col gap-2">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="h-[2px] rounded-full bg-[#E8E8E8]" style={{ width: `${70 + Math.sin(i * 1.7) * 20}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step pills — matches Figma exactly */}
      <div className="px-6 pb-5">
        <div className="flex gap-2 justify-between">
          {STEPS.map((step, i) => {
            const done = statuses[step] === 'done'
            const active = statuses[step] === 'active'
            const err = statuses[step] === 'error'
            return (
              <div
                key={step}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-500"
                style={{
                  backgroundColor: err ? '#FDF2F2' : done || active ? '#2D7DD2' : '#F5F5F5',
                  color: err ? '#D4183D' : done || active ? 'white' : '#888888',
                }}
              >
                {active && (
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2 border-white animate-spin"
                    style={{ borderTopColor: 'transparent' }}
                  />
                )}
                {done && <CheckCircle2 size={11} />}
                {err && <AlertTriangle size={11} />}
                <span>{step}</span>
              </div>
            )
          })}
        </div>
        {/* Arrow connectors */}
        <div className="flex justify-between px-8 mt-1.5">
          {[0, 1, 2].map(i => (
            <ChevronRight
              key={i}
              size={12}
              style={{ color: doneCount > i ? '#2D7DD2' : '#D0D0D0' }}
            />
          ))}
        </div>
      </div>

      {/* Elapsed timer */}
      <div className="pb-8 flex justify-center">
        <span className="text-xs font-mono" style={{ color: '#BBBBBB' }}>
          {elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(2)}s`} elapsed
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-8 rounded-2xl p-4 flex gap-3" style={{ backgroundColor: '#FDF2F2' }}>
          <AlertTriangle size={18} style={{ color: '#D4183D', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#D4183D' }}>Processing failed</p>
            <p className="text-xs mt-1" style={{ color: '#D4183D', opacity: 0.8 }}>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-3 text-xs font-semibold underline"
              style={{ color: '#2D7DD2' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
