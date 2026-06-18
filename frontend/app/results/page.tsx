'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Save, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

interface ScanResult {
  document_found: boolean
  original: string
  enhanced: string
  detected_overlay: string
  warped: string
  scan: string
  region_overlay: string
  regions: Array<{ x: number; y: number; w: number; h: number }>
  timings_ms: Record<string, number>
  total_ms: number
}

interface ClassifyResult {
  label: string
  confidence: number
}

const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  handwritten:   { bg: '#FEF3E2', text: '#F5A623' },
  invoice:       { bg: '#EBF3FC', text: '#2D7DD2' },
  form:          { bg: '#E8F4EC', text: '#3BB273' },
  printed_page:  { bg: '#F3EFFE', text: '#8B5CF6' },
}

const GRID_ITEMS = [
  { label: 'Original',   key: 'original'          },
  { label: 'Detected',   key: 'detected_overlay'  },
  { label: 'Regions',    key: 'region_overlay'     },
  { label: 'Binarized',  key: 'scan'              },
] as const

function b64Src(b64: string) {
  return `data:image/png;base64,${b64}`
}

function formatLabel(raw: string) {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ResultsPage() {
  const router = useRouter()
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [classify, setClassify] = useState<ClassifyResult | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('ss_scan_result')
    if (!raw) { router.replace('/'); return }
    setScan(JSON.parse(raw))
    const cls = sessionStorage.getItem('ss_classify_result')
    if (cls) setClassify(JSON.parse(cls))
  }, [router])

  if (!scan) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#2D7DD2', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const labelStyle = classify ? (LABEL_STYLES[classify.label] ?? { bg: '#F5F5F5', text: '#888888' }) : null

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-3 pb-4 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#888' }}>Scan Result</p>
        <h2 className="text-xl font-bold mt-0.5" style={{ color: '#1A1A1A' }}>Document Analysis</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* No-document warning */}
        {!scan.document_found && (
          <div className="flex gap-3 p-4 rounded-2xl" style={{ backgroundColor: '#FEF3E2' }}>
            <AlertTriangle size={18} style={{ color: '#F5A623', flexShrink: 0, marginTop: 1 }} />
            <p className="text-sm" style={{ color: '#F5A623' }}>
              No document boundary detected — full frame used as fallback.
            </p>
          </div>
        )}

        {/* Main warped image */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-white" style={{ aspectRatio: '0.8 / 1' }}>
          {scan.warped ? (
            <img src={b64Src(scan.warped)} alt="Warped scan" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs" style={{ color: '#BBBBBB' }}>Image unavailable</p>
            </div>
          )}
        </div>

        {/* 2×2 grid — original / detected / regions / binarized */}
        <div className="grid grid-cols-2 gap-3">
          {GRID_ITEMS.map(({ label, key }) => (
            <div key={key} className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#F5F5F5', aspectRatio: '1 / 0.85' }}>
              {scan[key as keyof ScanResult] ? (
                <img
                  src={b64Src(scan[key as keyof ScanResult] as string)}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs" style={{ color: '#BBBBBB' }}>—</p>
                </div>
              )}
              <p className="text-xs font-semibold px-2 pb-1.5 -mt-6 relative z-10 text-center drop-shadow"
                style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Classification badge */}
        {classify && labelStyle && (
          <div
            className="flex items-center justify-between px-5 py-3.5 rounded-full"
            style={{ backgroundColor: '#2D7DD2' }}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} color="white" />
              <span className="text-white font-semibold text-sm">{formatLabel(classify.label)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Confidence</span>
              <span className="text-white font-bold text-sm">{(classify.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Stat chips */}
        <div className="flex gap-2">
          {[
            { label: 'Latency',  value: `${Math.round(scan.total_ms)} ms` },
            { label: 'Regions',  value: String(scan.regions.length) },
            {
              label: 'Found',
              value: scan.document_found ? 'Yes' : 'No',
              icon: scan.document_found
                ? <CheckCircle2 size={12} style={{ color: '#3BB273' }} />
                : <XCircle size={12} style={{ color: '#D4183D' }} />,
            },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center py-3 rounded-2xl"
              style={{ backgroundColor: 'white' }}
            >
              <span className="text-xs" style={{ color: '#888' }}>{label}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {icon}
                <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-2">
          <button
            onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
            style={{ borderColor: '#2D7DD2', color: '#2D7DD2' }}
          >
            <RotateCcw size={16} />
            Scan Again
          </button>
          <button
            disabled
            title="Sign in to save — coming with Supabase auth"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-white cursor-not-allowed"
            style={{ backgroundColor: '#C0D8F0' }}
          >
            <Save size={16} />
            Save Result
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
