'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FileText,
  HardDrive,
  Info,
  Lock,
  Shield,
  Sliders,
  UserCircle2,
} from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

// ── Storage size helper ───────────────────────────────────────────────────────

function getStorageUsed(): string {
  try {
    let bytes = 0
    for (const key of Object.keys(localStorage)) {
      bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2
    }
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1_048_576).toFixed(1)} MB`
  } catch {
    return '—'
  }
}

// ── Static page content ───────────────────────────────────────────────────────

type Section = 'privacy' | 'terms' | 'permissions' | 'licenses'

const PAGES: Record<Section, { title: string; content: React.ReactNode }> = {
  privacy: {
    title: 'Privacy Policy',
    content: (
      <div className="flex flex-col gap-5 text-sm" style={{ color: '#1A1A1A' }}>
        <div>
          <p className="font-bold text-base">SmartScan Privacy Policy</p>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>Demo Version · Last updated: June 2026</p>
        </div>

        <p style={{ color: '#444', lineHeight: 1.65 }}>
          This is a demonstration application built for academic purposes (CSCI435, University of
          Wollongong in Dubai). It is not a commercial product and does not collect data for any
          purpose beyond local functionality.
        </p>

        <div>
          <p className="font-semibold mb-2">What we store</p>
          <ul className="flex flex-col gap-2" style={{ color: '#444' }}>
            {[
              'Scanned documents and classification results are stored locally on your device only.',
              'No images, text, or personal data are transmitted to or stored on any external server, except temporarily during processing by the document scanning and classification services.',
              'We do not use cookies, trackers, or third-party analytics.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2" style={{ lineHeight: 1.6 }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2D7DD2' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold mb-2">What we don't do</p>
          <ul className="flex flex-col gap-2" style={{ color: '#444' }}>
            {[
              'We do not sell, share, or monetize any data.',
              'We do not retain copies of scanned documents after processing.',
              'We do not require account creation to use core scanning features.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2" style={{ lineHeight: 1.6 }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2D7DD2' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs p-3 rounded-xl" style={{ color: '#888', backgroundColor: '#F5F5F5', lineHeight: 1.6 }}>
          Since this is a student project, this policy is provided for demonstration purposes and
          does not constitute a legally binding agreement.
        </p>
      </div>
    ),
  },

  terms: {
    title: 'Terms of Service',
    content: (
      <div className="flex flex-col gap-5 text-sm" style={{ color: '#1A1A1A' }}>
        <div>
          <p className="font-bold text-base">SmartScan Terms of Service</p>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>Demo Version · Last updated: June 2026</p>
        </div>

        <p style={{ color: '#444', lineHeight: 1.65 }}>
          By using this application, you acknowledge that:
        </p>

        <ol className="flex flex-col gap-3">
          {[
            'This is an academic prototype developed as part of a university coursework project and is not intended for production or commercial use.',
            'The document scanning and classification features are experimental and may not perform reliably under all conditions.',
            'You should not upload sensitive, confidential, or personally identifiable documents, as this app has not undergone formal security review.',
            'The developers make no warranties regarding accuracy, availability, or fitness for any particular purpose.',
            'This software is provided "as is" for educational demonstration only.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3" style={{ color: '#444', lineHeight: 1.6 }}>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: '#2D7DD2' }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>

        <p className="text-xs p-3 rounded-xl" style={{ color: '#888', backgroundColor: '#F5F5F5', lineHeight: 1.6 }}>
          Continued use of the app constitutes acceptance of these terms.
        </p>
      </div>
    ),
  },

  permissions: {
    title: 'Data & Permissions',
    content: (
      <div className="flex flex-col gap-4 text-sm" style={{ color: '#1A1A1A' }}>
        <p className="font-bold text-base">Data & Permissions</p>

        {[
          {
            icon: '📷',
            title: 'Camera Access',
            body: 'Used only to capture document images for scanning. Images are processed and discarded — nothing is uploaded without your action.',
          },
          {
            icon: '💾',
            title: 'Storage Access',
            body: 'Used to save scan history and results locally on your device using localStorage. You can clear this at any time from Settings.',
          },
          {
            icon: '🌐',
            title: 'Network Access',
            body: 'Used to send document images to the scanning and classification services for processing. No data is retained server-side after a response is returned.',
          },
        ].map(({ icon, title, body }) => (
          <div key={title} className="p-4 rounded-2xl" style={{ backgroundColor: '#F8F8F8' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{icon}</span>
              <p className="font-semibold">{title}</p>
            </div>
            <p style={{ color: '#555', lineHeight: 1.65 }}>{body}</p>
          </div>
        ))}

        <p className="text-xs p-3 rounded-xl" style={{ color: '#888', backgroundColor: '#F5F5F5', lineHeight: 1.6 }}>
          You can revoke any of these permissions at any time through your device or browser settings.
        </p>
      </div>
    ),
  },

  licenses: {
    title: 'Open Source & Licences',
    content: (
      <div className="flex flex-col gap-5 text-sm" style={{ color: '#1A1A1A' }}>
        <p className="font-bold text-base">Open Source & Acknowledgements</p>

        {[
          {
            heading: 'Computer Vision',
            items: [
              { name: 'OpenCV', licence: 'Apache 2.0', note: 'image processing, edge detection, perspective transforms' },
            ],
          },
          {
            heading: 'Machine Learning',
            items: [
              { name: 'PyTorch', licence: 'BSD', note: 'model training and inference' },
              { name: 'torchvision', licence: 'BSD', note: 'MobileNetV2 architecture and image transforms' },
            ],
          },
          {
            heading: 'Backend',
            items: [
              { name: 'FastAPI', licence: 'MIT', note: 'API framework' },
              { name: 'Uvicorn', licence: 'BSD', note: 'ASGI server' },
            ],
          },
          {
            heading: 'Frontend',
            items: [
              { name: 'Next.js', licence: 'MIT', note: 'React framework' },
              { name: 'Tailwind CSS', licence: 'MIT', note: 'utility-first styling' },
              { name: 'Lucide React', licence: 'ISC', note: 'icon library' },
            ],
          },
          {
            heading: 'Training Datasets',
            items: [
              { name: 'OCR Dataset of Multi-type Documents', licence: 'MIT', note: 'senju14 · Kaggle' },
              { name: 'Scanned Images Dataset for OCR and VLM finetuning', licence: 'MIT', note: 'suvroo · Kaggle' },
            ],
          },
        ].map(({ heading, items }) => (
          <div key={heading}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#AAAAAA' }}>
              {heading}
            </p>
            <div className="flex flex-col gap-2">
              {items.map(({ name, licence, note }) => (
                <div key={name} className="flex items-start justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8F8F8' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>{note}</p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#EBF3FC', color: '#2D7DD2' }}
                  >
                    {licence}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs p-3 rounded-xl" style={{ color: '#888', backgroundColor: '#F5F5F5', lineHeight: 1.6 }}>
          Developed as part of CSCI435 — Computer Vision Algorithms and Systems ·
          University of Wollongong in Dubai
        </p>
      </div>
    ),
  },
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="px-5 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#AAAAAA' }}>
      {title}
    </p>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 rounded-2xl overflow-hidden bg-white mb-4">{children}</div>
}

function Divider() {
  return <div className="h-px mx-4" style={{ backgroundColor: '#F2F2F2' }} />
}

function Row({
  icon, label, value, onPress,
}: {
  icon: React.ReactNode; label: string; value?: string; onPress?: () => void
}) {
  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3.5 w-full px-4 py-3.5 text-left transition-all active:bg-gray-50"
    >
      <span style={{ color: '#888' }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>{label}</span>
      {value && <span className="text-xs mr-1" style={{ color: '#BBBBBB' }}>{value}</span>}
      <ChevronRight size={15} style={{ color: '#DDDDDD' }} />
    </button>
  )
}

function Toggle({ icon, label, enabled, onToggle }: {
  icon: React.ReactNode; label: string; enabled: boolean; onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <span style={{ color: '#888' }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>{label}</span>
      <button
        onClick={onToggle}
        style={{
          width: 44, height: 26, borderRadius: 13,
          backgroundColor: enabled ? '#2D7DD2' : '#D8D8D8',
          position: 'relative', flexShrink: 0,
          transition: 'background-color 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: enabled ? 20 : 2,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [storageUsed, setStorageUsed] = useState('—')
  const [selected, setSelected] = useState<Section | null>(null)

  useEffect(() => { setStorageUsed(getStorageUsed()) }, [])

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    const page = PAGES[selected]
    return (
      <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
        <div className="h-11 flex-shrink-0" />

        <div className="flex items-center gap-3 px-4 pt-3 pb-4 border-b" style={{ borderColor: '#F0F0F0' }}>
          <button
            onClick={() => setSelected(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <ArrowLeft size={18} style={{ color: '#1A1A1A' }} />
          </button>
          <h2 className="text-base font-bold" style={{ color: '#1A1A1A' }}>{page.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {page.content}
          <div className="pb-6" />
        </div>

        <BottomNav />
      </div>
    )
  }

  // ── Settings list ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      <div className="px-5 pt-4 pb-4 bg-white mb-3">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Account card */}
        <div className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-4 bg-white">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F5' }}>
            <UserCircle2 size={32} style={{ color: '#BBBBBB' }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: '#1A1A1A' }}>Guest User</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Not signed in</p>
            <button className="mt-1.5 text-xs font-semibold" style={{ color: '#2D7DD2' }}>
              Sign in for full access →
            </button>
          </div>
        </div>

        {/* Preferences */}
        <SectionLabel title="Preferences" />
        <SettingsCard>
          <Toggle icon={<Bell size={18} />} label="Notifications" enabled={notificationsOn} onToggle={() => setNotificationsOn(v => !v)} />
          <Divider />
          <Row icon={<HardDrive size={18} />} label="Storage Used" value={storageUsed} />
          <Divider />
          <Row icon={<Sliders size={18} />} label="Default Scan Quality" value="High" />
        </SettingsCard>

        {/* Privacy & Legal */}
        <SectionLabel title="Privacy & Legal" />
        <SettingsCard>
          <Row icon={<Lock size={18} />}     label="Privacy Policy"     onPress={() => setSelected('privacy')} />
          <Divider />
          <Row icon={<FileText size={18} />} label="Terms of Service"   onPress={() => setSelected('terms')} />
          <Divider />
          <Row icon={<Shield size={18} />}   label="Data & Permissions" onPress={() => setSelected('permissions')} />
        </SettingsCard>

        {/* About */}
        <SectionLabel title="About" />
        <SettingsCard>
          <Row icon={<Info size={18} />}     label="App Version"           value="1.4.2" />
          <Divider />
          <Row icon={<FileText size={18} />} label="Open Source & Licences" onPress={() => setSelected('licenses')} />
        </SettingsCard>

        {/* Sign in CTA */}
        <div className="px-4 pt-1 pb-6">
          <button
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95"
            style={{ backgroundColor: '#2D7DD2' }}
          >
            <UserCircle2 size={18} />
            Sign In / Create Account
          </button>
          <p className="text-center text-xs mt-3" style={{ color: '#BBBBBB' }}>
            SmartScan v1.4.2 · CSCI435 Demo
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
