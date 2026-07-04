'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Check, Download, FolderOpen, Image as ImageIcon, Maximize2, Plus, Trash2, Upload, X } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { getHistory, type HistoryItem } from '@/lib/history'
import {
  getFolders, createFolder, deleteFolder,
  removeItemFromFolder, addItemToFolder, type Folder,
} from '@/lib/folders'
import { useDogeMode } from '@/lib/useDogeMode'

const ALL_SCANS_ID = '__all__'

// ── All Scans system card (full-width) ────────────────────────────────────────

function AllScansCard({
  items, onClick, dogeMode,
}: { items: HistoryItem[]; onClick: () => void; dogeMode: boolean }) {
  const MAX_THUMBS = 5
  const visible = items.slice(0, MAX_THUMBS)
  const overflow = Math.max(0, items.length - MAX_THUMBS)

  return (
    <button
      onClick={onClick}
      className="col-span-2 bg-white rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#EBF3FC' }}
        >
          <FolderOpen size={20} style={{ color: '#2D7DD2' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>
            {dogeMode ? <>All Sniffs <img src="/sidedog.png" alt="dog" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'All Scans'}
          </p>
          <p className="text-xs" style={{ color: '#888' }}>
            {items.length} {dogeMode ? 'sniff' : 'scan'}{items.length !== 1 ? 's' : ''}, default
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#EBF3FC', color: '#2D7DD2' }}
        >
          System
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5" style={{ height: 40 }}>
        {visible.map(item => (
          <div
            key={item.id}
            className="h-full rounded-lg overflow-hidden flex-1"
            style={{ backgroundColor: '#EBF3FC' }}
          >
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div
            className="h-full rounded-lg flex-1 flex items-center justify-center"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <p className="text-xs" style={{ color: '#CCCCCC' }}>
              {dogeMode ? 'No sniffs yet' : 'No scans yet'}
            </p>
          </div>
        )}
        {overflow > 0 && (
          <div
            className="h-full px-2 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: '#F0F0F0', color: '#888' }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Folder card ───────────────────────────────────────────────────────────────

function FolderCard({
  folder, items, onClick, dogeMode,
}: { folder: Folder; items: HistoryItem[]; onClick: () => void; dogeMode: boolean }) {
  const MAX_THUMBS = 3
  const visible = items.slice(0, MAX_THUMBS)
  const overflow = Math.max(0, items.length - MAX_THUMBS)

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 text-left transition-all active:scale-[0.97]"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: folder.bg }}
      >
        <FolderOpen size={24} style={{ color: folder.color }} />
      </div>
      <p className="font-bold text-sm leading-snug" style={{ color: '#1A1A1A' }}>{folder.name}</p>
      <p className="text-xs mt-0.5 mb-3" style={{ color: '#888' }}>
        {items.length} {dogeMode ? 'sniff' : 'scan'}{items.length !== 1 ? 's' : ''}
      </p>
      <div className="flex gap-1.5">
        {visible.map(item => (
          <div
            key={item.id}
            className="h-7 rounded-lg overflow-hidden flex-1"
            style={{ backgroundColor: folder.bg }}
          >
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="h-7 rounded-lg flex-1" style={{ backgroundColor: folder.bg }} />
        )}
        {overflow > 0 && (
          <div
            className="h-7 px-2 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: '#F0F0F0', color: '#888' }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </button>
  )
}

// ── New folder card ───────────────────────────────────────────────────────────

function NewFolderCard({ onClick, dogeMode }: { onClick: () => void; dogeMode: boolean }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]"
      style={{ border: '2px dashed #D0D0D0', minHeight: 168 }}
    >
      <Plus size={22} style={{ color: '#BBBBBB' }} />
      <p className="text-sm font-medium" style={{ color: '#BBBBBB' }}>
        {dogeMode ? 'New Kennel' : 'New Folder'}
      </p>
    </button>
  )
}

// ── New folder sheet ──────────────────────────────────────────────────────────

function NewFolderSheet({
  onCancel, onCreate, dogeMode,
}: { onCancel: () => void; onCreate: (name: string) => void; dogeMode: boolean }) {
  const [name, setName] = useState('')
  const ready = name.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl px-5 pt-4 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E0E0E0' }} />
        <h3 className="text-lg font-bold mb-5" style={{ color: '#1A1A1A' }}>
          {dogeMode ? <>New Kennel <img src="/sidedog.png" alt="dog" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'New Folder'}
        </h3>
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <FolderOpen size={18} style={{ color: '#BBBBBB' }} />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#1A1A1A' }}
            placeholder={dogeMode ? 'Kennel name' : 'Folder name'}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && ready) onCreate(name) }}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2"
            style={{ borderColor: '#E0E0E0', color: '#888' }}
          >
            Cancel
          </button>
          <button
            onClick={() => ready && onCreate(name)}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all"
            style={{ backgroundColor: ready ? '#2D7DD2' : '#BBBBBB' }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add existing scans sheet ──────────────────────────────────────────────────

function AddScansSheet({
  allHistory, existingIds, onAdd, onCancel, dogeMode,
}: {
  allHistory: HistoryItem[]
  existingIds: string[]
  onAdd: (ids: string[]) => void
  onCancel: () => void
  dogeMode: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const available = allHistory.filter(h => !existingIds.includes(h.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const n = selected.size

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl px-5 pt-4 pb-10 flex flex-col"
        style={{ maxHeight: '78vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: '#E0E0E0' }} />
        <h3 className="text-base font-bold mb-0.5" style={{ color: '#1A1A1A' }}>
          {dogeMode ? 'Pick Sniffs to Add' : 'Add Existing Scans'}
        </h3>
        <p className="text-sm mb-4" style={{ color: '#888' }}>
          {available.length === 0
            ? (dogeMode ? 'No other sniffs to add.' : 'No other scans to add.')
            : `${n} of ${available.length} selected`}
        </p>

        {available.length === 0 ? (
          <div className="flex-1 flex items-center justify-center pb-6">
            <p className="text-sm text-center" style={{ color: '#BBBBBB', maxWidth: 200 }}>
              {dogeMode ? <>All sniffs are already here! Good dog. <img src="/bone.png" alt="bone" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'All scans are already in this folder.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4 min-h-0">
            {available.map(item => {
              const sel = selected.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] flex-shrink-0"
                  style={{
                    backgroundColor: sel ? '#EBF3FC' : '#FAFAFA',
                    border: `1.5px solid ${sel ? '#2D7DD2' : '#F0F0F0'}`,
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: '#F0F0F0' }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={16} style={{ color: '#CCCCCC' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                      {item.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ backgroundColor: sel ? '#2D7DD2' : '#E8E8E8' }}
                  >
                    {sel && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {available.length > 0 && (
          <button
            onClick={() => n > 0 && onAdd([...selected])}
            className="w-full py-3.5 rounded-full font-semibold text-sm text-white transition-all"
            style={{ backgroundColor: n > 0 ? '#2D7DD2' : '#BBBBBB' }}
          >
            {dogeMode
              ? `Bury ${n > 0 ? n : ''} Sniff${n !== 1 ? 's' : ''} Here`
              : `Add ${n > 0 ? n : ''} Scan${n !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Folder detail view ────────────────────────────────────────────────────────

function FolderDetailView({
  folder, allHistory, onBack, onDelete, onRemoveItem, onRefresh, dogeMode,
}: {
  folder: Folder
  allHistory: HistoryItem[]
  onBack: () => void
  onDelete: () => void
  onRemoveItem: (itemId: string) => void
  onRefresh: () => void
  dogeMode: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [lightboxItem, setLightboxItem] = useState<HistoryItem | null>(null)

  const isSystem = folder.id === ALL_SCANS_ID
  const items = allHistory.filter(h => folder.itemIds.includes(h.id))

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      sessionStorage.setItem('ss_image', reader.result as string)
      router.push('/processing')
    }
    reader.readAsDataURL(file)
  }

  function handleAddItems(ids: string[]) {
    ids.forEach(id => addItemToFolder(folder.id, id))
    setShowAddSheet(false)
    onRefresh()
  }

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-4 border-b" style={{ borderColor: '#F0F0F0' }}>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <ArrowLeft size={18} style={{ color: '#1A1A1A' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate" style={{ color: '#1A1A1A' }}>{folder.name}</h2>
          <p className="text-xs" style={{ color: '#888' }}>
            {items.length} {dogeMode ? 'sniff' : 'item'}{items.length !== 1 ? 's' : ''}
            {isSystem && ', default'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add existing — only for user folders */}
          {!isSystem && (
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#EBF3FC' }}
            >
              <Plus size={18} style={{ color: '#2D7DD2' }} />
            </button>
          )}
          {/* Delete — only for user folders */}
          {!isSystem && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#FDF2F2' }}
            >
              <Trash2 size={16} style={{ color: '#D4183D' }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <ImageIcon size={32} style={{ color: '#CCCCCC' }} />
          </div>
          <div className="text-center">
            <p className="font-bold text-base mb-1" style={{ color: '#1A1A1A' }}>
              {dogeMode ? 'No sniffs yet' : 'No scans yet'}
            </p>
            <p className="text-sm" style={{ color: '#888', lineHeight: 1.6 }}>
              {dogeMode
                ? 'Sniff a document or fetch an existing one.'
                : 'Scan a document or add existing scans.'}
            </p>
          </div>

          {/* Empty state actions */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => router.push('/camera')}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95"
              style={{ backgroundColor: '#2D7DD2' }}
            >
              <Camera size={17} />
              {dogeMode ? <>Sniff with Camera <img src="/sidedog.png" alt="dog" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'Scan with Camera'}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
              style={{ borderColor: '#2D7DD2', color: '#2D7DD2' }}
            >
              <Upload size={17} />
              {dogeMode ? <>Fetch Image <img src="/tennsiball.png" alt="ball" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'Upload Image to Scan'}
            </button>
            {!isSystem && (
              <button
                onClick={() => setShowAddSheet(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2"
                style={{ borderColor: '#E0E0E0', color: '#888' }}
              >
                <Plus size={17} />
                {dogeMode ? 'Add Existing Sniffs' : 'Add Existing Scans'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0' }}
            >
              {/* Thumbnail — tap to open lightbox */}
              <button
                onClick={() => item.thumbnail && setLightboxItem(item)}
                className="relative flex-shrink-0 w-14 h-16 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: '#F0F0F0' }}
              >
                {item.thumbnail ? (
                  <>
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    {/* Always-visible expand badge */}
                    <div
                      className="absolute bottom-1 right-1 w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    >
                      <Maximize2 size={9} color="white" />
                    </div>
                  </>
                ) : (
                  <ImageIcon size={18} style={{ color: '#CCCCCC' }} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                  {item.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                  {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Save to device */}
              {item.thumbnail && (
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = item.thumbnail
                    a.download = `scanmint_${item.label}_${item.timestamp}.jpg`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F5F5F5' }}
                >
                  <Download size={14} style={{ color: '#555' }} />
                </button>
              )}

              {!isSystem && (
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F5F5F5' }}
                >
                  <Trash2 size={14} style={{ color: '#AAAAAA' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem?.thumbnail && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxItem(null)}
        >
          {/* Close button */}
          <div className="flex justify-end p-5 pt-14 flex-shrink-0">
            <button
              onClick={() => setLightboxItem(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <X size={18} color="white" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 pb-12" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxItem.thumbnail}
              alt=""
              className="max-w-full max-h-full rounded-2xl"
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Label */}
          <div className="pb-10 flex justify-center flex-shrink-0">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {lightboxItem.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Delete folder confirm sheet */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-t-3xl px-6 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E0E0E0' }} />
            <h3 className="text-base font-bold mb-1" style={{ color: '#1A1A1A' }}>
              {dogeMode ? 'Demolish kennel?' : 'Delete folder?'}
            </h3>
            <p className="text-sm mb-5" style={{ color: '#888' }}>
              {dogeMode
                ? 'The kennel will be gone. Sniffs inside stay in your log.'
                : 'The folder will be deleted. Scans inside will remain in your history.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm border-2"
                style={{ borderColor: '#E0E0E0', color: '#888' }}
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white"
                style={{ backgroundColor: '#D4183D' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add existing scans sheet */}
      {showAddSheet && (
        <AddScansSheet
          allHistory={allHistory}
          existingIds={items.map(i => i.id)}
          onAdd={handleAddItems}
          onCancel={() => setShowAddSheet(false)}
          dogeMode={dogeMode}
        />
      )}

      <BottomNav />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const dogeMode = useDogeMode()
  const [folders, setFolders] = useState<Folder[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null)
  const [showSheet, setShowSheet] = useState(false)

  function load() {
    const f = getFolders()
    const h = getHistory()
    setFolders(f)
    setHistory(h)
    if (activeFolder && activeFolder.id !== ALL_SCANS_ID) {
      setActiveFolder(f.find(x => x.id === activeFolder.id) ?? null)
    } else if (activeFolder?.id === ALL_SCANS_ID) {
      // Refresh the virtual folder's itemIds
      setActiveFolder({ ...activeFolder, itemIds: h.map(i => i.id) })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCreate(name: string) {
    createFolder(name.trim())
    setShowSheet(false)
    load()
  }

  function handleDeleteFolder(id: string) {
    deleteFolder(id)
    setActiveFolder(null)
    load()
  }

  function handleRemoveItem(folderId: string, itemId: string) {
    removeItemFromFolder(folderId, itemId)
    const updated = getFolders()
    setFolders(updated)
    setActiveFolder(updated.find(f => f.id === folderId) ?? null)
  }

  function handleRefresh() {
    const f = getFolders()
    const h = getHistory()
    setFolders(f)
    setHistory(h)
    if (activeFolder && activeFolder.id !== ALL_SCANS_ID) {
      setActiveFolder(f.find(x => x.id === activeFolder.id) ?? null)
    }
  }

  // Virtual "All Scans" folder built from full history
  const allScansFolder: Folder = {
    id: ALL_SCANS_ID,
    name: dogeMode ? 'All Sniffs' : 'All Scans',
    color: '#2D7DD2',
    bg: '#EBF3FC',
    itemIds: history.map(h => h.id),
  }

  const totalScans = folders.reduce((s, f) => s + f.itemIds.length, 0)

  if (activeFolder) {
    return (
      <FolderDetailView
        folder={activeFolder}
        allHistory={history}
        onBack={() => setActiveFolder(null)}
        onDelete={() => handleDeleteFolder(activeFolder.id)}
        onRemoveItem={itemId => handleRemoveItem(activeFolder.id, itemId)}
        onRefresh={handleRefresh}
        dogeMode={dogeMode}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-end justify-between px-5 pt-4 pb-4 bg-white">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
            {dogeMode ? <>The Kennel <img src="/sidedog.png" alt="dog" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle' }} /></> : 'Saved'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
            {dogeMode
              ? `${folders.length} kennel${folders.length !== 1 ? 's' : ''}, ${totalScans} buried`
              : `${folders.length} folder${folders.length !== 1 ? 's' : ''}, ${totalScans} scan${totalScans !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
          style={{ backgroundColor: '#2D7DD2' }}
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Folder grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {/* System: All Scans — always first, full width */}
          <AllScansCard
            items={history}
            onClick={() => setActiveFolder(allScansFolder)}
            dogeMode={dogeMode}
          />

          {/* User folders */}
          {folders.map(folder => {
            const items = history.filter(h => folder.itemIds.includes(h.id))
            return (
              <FolderCard
                key={folder.id}
                folder={folder}
                items={items}
                onClick={() => setActiveFolder(folder)}
                dogeMode={dogeMode}
              />
            )
          })}

          {/* New folder card */}
          <NewFolderCard onClick={() => setShowSheet(true)} dogeMode={dogeMode} />
        </div>
      </div>

      {showSheet && (
        <NewFolderSheet onCancel={() => setShowSheet(false)} onCreate={handleCreate} dogeMode={dogeMode} />
      )}

      <BottomNav />
    </div>
  )
}
