'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Doc = {
  id: string
  created_at: string
  employee_id: string | null
  name: string
  type: string
  category: string
  storage_path: string
  size_bytes: number | null
  expiry_date: string | null
  issued_date: string | null
  notes: string | null
  issuer: string | null
  document_number: string | null
  nationality: string | null
  has_us_visa: boolean | null
  uploader: { id: string; full_name: string } | null
}

type Employee = {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
}

// Document categories with their types
const DOC_CATEGORIES: {
  key: string
  label: string
  icon: string
  color: string
  types: { key: string; label: string; requiresExpiry?: boolean; requiresFile?: boolean; special?: string }[]
}[] = [
  {
    key: 'employment',
    label: 'Employment',
    icon: '📋',
    color: 'blue',
    types: [
      { key: 'employment_agreement',   label: 'Employment Agreement',    requiresFile: true },
      { key: 'offer_letter',           label: 'Offer Letter / Email',    requiresFile: true },
      { key: 'amendment_annex',        label: 'Amendment / Annex',       requiresFile: true },
      { key: 'nda',                    label: 'NDA',                     requiresFile: true },
      { key: 'handbook_acknowledgment',label: 'Handbook Acknowledgment', requiresFile: true },
    ],
  },
  {
    key: 'identity',
    label: 'Identity & Authorization',
    icon: '🪪',
    color: 'purple',
    types: [
      { key: 'id_passport',            label: 'ID / Passport',           requiresExpiry: true, requiresFile: true },
      { key: 'work_authorization',     label: 'Work Authorization',      requiresExpiry: true, requiresFile: true },
      { key: 'us_visa',                label: 'US Visa',                 requiresExpiry: true, special: 'us_visa' },
      { key: 'police_certificate',     label: 'Police Certificate',      requiresExpiry: true, requiresFile: true },
      { key: 'medical_certificate',    label: 'Medical Certificate',     requiresExpiry: true, requiresFile: true },
    ],
  },
  {
    key: 'performance',
    label: 'Performance & Conduct',
    icon: '📊',
    color: 'green',
    types: [
      { key: 'performance_document',   label: 'Performance Document',    requiresFile: true },
      { key: 'disciplinary',           label: 'Disciplinary Document',   requiresFile: true },
    ],
  },
  {
    key: 'training',
    label: 'Training & Assets',
    icon: '🎓',
    color: 'amber',
    types: [
      { key: 'training_certificate',   label: 'Training Certificate',    requiresExpiry: true, requiresFile: true },
      { key: 'company_asset_form',     label: 'Company Asset Form',      requiresFile: true },
    ],
  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  blue:   { bg: 'bg-blue-900',   text: 'text-blue-700',   border: 'border-blue-200',   lightBg: 'bg-blue-50' },
  purple: { bg: 'bg-purple-900', text: 'text-purple-700', border: 'border-purple-200', lightBg: 'bg-purple-50' },
  green:  { bg: 'bg-green-900',  text: 'text-green-700',  border: 'border-green-200',  lightBg: 'bg-green-50' },
  amber:  { bg: 'bg-amber-900',  text: 'text-amber-700',  border: 'border-amber-200',  lightBg: 'bg-amber-50' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export default function PersonalDocuments({
  docs,
  employees,
  currentUserId,
  currentUserName,
  isHR,
  today,
  in30,
}: {
  docs: Doc[]
  employees: Employee[]
  currentUserId: string
  currentUserName: string
  isHR: boolean
  today: string
  in30: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].key)
  const [selectedType, setSelectedType] = useState(DOC_CATEGORIES[0].types[0].key)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    employee_id: currentUserId,
    name: '',
    issued_date: '',
    expiry_date: '',
    issuer: '',
    notes: '',
    document_number: '',
    nationality: '',
    has_us_visa: '' as '' | 'yes' | 'no',
  })

  const currentCategory = DOC_CATEGORIES.find((c) => c.key === selectedCategory)!
  const currentType = currentCategory.types.find((t) => t.key === selectedType) ?? currentCategory.types[0]

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  function handleCategoryChange(catKey: string) {
    setSelectedCategory(catKey)
    const cat = DOC_CATEGORIES.find((c) => c.key === catKey)!
    setSelectedType(cat.types[0].key)
  }

  async function handleUpload() {
    if (!form.name) { setError('Document name is required.'); return }
    if (currentType.requiresFile && !file) { setError('Please select a file to upload.'); return }
    setUploading(true); setError(null)

    const supabase = createClient()
    let storage_path = ''

    if (file) {
      const ext = file.name.split('.').pop()
      const folder = form.employee_id
      const path = `${folder}/${Date.now()}-${selectedType}.${ext}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (uploadError) { setError(uploadError.message); setUploading(false); return }
      storage_path = path
    }

    const { error: insertError } = await supabase.from('documents').insert({
      scope: 'personal',
      employee_id: form.employee_id,
      type: selectedType,
      category: selectedCategory,
      name: form.name,
      storage_path: storage_path || `no-file/${Date.now()}`,
      uploaded_by: currentUserId,
      size_bytes: file?.size ?? null,
      issued_date: form.issued_date || null,
      expiry_date: form.expiry_date || null,
      issuer: form.issuer || null,
      notes: form.notes || null,
      document_number: form.document_number || null,
      nationality: form.nationality || null,
      has_us_visa: currentType.special === 'us_visa' ? form.has_us_visa === 'yes' : null,
    } as any)

    setUploading(false)
    if (insertError) { setError(insertError.message); return }

    setShowUpload(false)
    setFile(null)
    setForm({ employee_id: currentUserId, name: '', issued_date: '', expiry_date: '', issuer: '', notes: '', document_number: '', nationality: '', has_us_visa: '' })
    router.refresh()
  }

  async function openDoc(doc: Doc) {
    if (doc.storage_path.startsWith('no-file/')) return
    const supabase = createClient()
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    const supabase = createClient()
    if (!doc.storage_path.startsWith('no-file/')) {
      await supabase.storage.from('documents').remove([doc.storage_path])
    }
    await supabase.from('documents').delete().eq('id', doc.id)
    router.refresh()
  }

  // Filter and group docs by category
  const filtered = filterEmployee ? docs.filter((d) => d.employee_id === filterEmployee) : docs
  const grouped: Record<string, Doc[]> = {}
  filtered.forEach((doc) => {
    const cat = doc.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(doc)
  })

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'
  const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {isHR && (
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none"
            >
              <option value="">All employees</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowUpload((p) => !p)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Document
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Add Employee Document</h2>
            <button onClick={() => setShowUpload(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-5">
            {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

            {/* Employee — HR only */}
            {isHR && (
              <div>
                <label className={labelClass}>Employee *</label>
                <select name="employee_id" value={form.employee_id} onChange={handleChange} className={inputClass}>
                  <option value={currentUserId}>{currentUserName} (me)</option>
                  {employees.filter((e) => e.id !== currentUserId).map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category selector */}
            <div>
              <label className={labelClass}>Document Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOC_CATEGORIES.map((cat) => {
                  const colors = COLOR_MAP[cat.color]
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleCategoryChange(cat.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                        selectedCategory === cat.key
                          ? `bg-zinc-900 text-white border-zinc-900`
                          : `${colors.lightBg} ${colors.text} ${colors.border} hover:border-zinc-400`
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className={labelClass}>Document Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentCategory.types.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setSelectedType(type.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                      selectedType === type.key
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {type.label}
                    {type.requiresExpiry && <span className="text-xs opacity-60">📅</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className={labelClass}>Document Name *</label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder={`e.g. ${currentType.label} - ${new Date().getFullYear()}`}
                  className={inputClass} />
              </div>

              {/* US Visa special field */}
              {currentType.special === 'us_visa' && (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Has US Visa?</label>
                  <div className="flex items-center gap-3">
                    {['yes', 'no'].map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="has_us_visa"
                          value={v}
                          checked={form.has_us_visa === v}
                          onChange={handleChange}
                          className="accent-zinc-900"
                        />
                        <span className="text-sm text-zinc-700 capitalize">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Document number for ID/Passport */}
              {selectedType === 'id_passport' && (
                <>
                  <div>
                    <label className={labelClass}>Document Number</label>
                    <input name="document_number" value={form.document_number} onChange={handleChange} placeholder="e.g. AB1234567" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nationality</label>
                    <input name="nationality" value={form.nationality} onChange={handleChange} placeholder="e.g. Kosovo" className={inputClass} />
                  </div>
                </>
              )}

              {/* Work authorization nationality */}
              {selectedType === 'work_authorization' && (
                <div>
                  <label className={labelClass}>Nationality (if different)</label>
                  <input name="nationality" value={form.nationality} onChange={handleChange} placeholder="e.g. Albania" className={inputClass} />
                </div>
              )}

              {/* Issued by */}
              <div>
                <label className={labelClass}>Issued By</label>
                <input name="issuer" value={form.issuer} onChange={handleChange} placeholder="Issuing authority or person" className={inputClass} />
              </div>

              {/* Issue date */}
              <div>
                <label className={labelClass}>Issue Date</label>
                <input name="issued_date" type="date" value={form.issued_date} onChange={handleChange} className={inputClass} />
              </div>

              {/* Expiry date */}
              {currentType.requiresExpiry && (
                <div>
                  <label className={labelClass}>Expiry Date {currentType.requiresExpiry && '*'}</label>
                  <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} min={today} className={inputClass} />
                </div>
              )}

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" className={inputClass} />
              </div>

              {/* File upload */}
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  File {currentType.requiresFile ? '*' : '(optional)'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    file ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">{file.name}</span>
                      <span className="text-xs text-zinc-400">{formatBytes(file.size)}</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-7 h-7 text-zinc-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-zinc-500">Click to upload</p>
                      <p className="text-xs text-zinc-400 mt-0.5">PDF, JPG, PNG · Max 10MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleUpload} disabled={uploading || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {uploading ? 'Adding…' : 'Add Document'}
              </button>
              <button onClick={() => { setShowUpload(false); setError(null); setFile(null) }}
                className="px-4 py-2.5 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents grouped by category */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
          <p className="text-2xl mb-3">📂</p>
          <p className="text-sm font-medium text-zinc-900">No documents yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add employment, identity or performance documents.</p>
        </div>
      ) : (
        DOC_CATEGORIES.map((cat) => {
          const catDocs = grouped[cat.key] ?? []
          if (catDocs.length === 0) return null
          const colors = COLOR_MAP[cat.color]
          const isExpanded = expandedCategory === null || expandedCategory === cat.key

          return (
            <div key={cat.key} className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setExpandedCategory(isExpanded && expandedCategory === cat.key ? null : cat.key)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{cat.icon}</span>
                  <h2 className="text-sm font-semibold text-zinc-900">{cat.label}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.lightBg} ${colors.text} ${colors.border} border`}>
                    {catDocs.length}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expandedCategory === cat.key ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Docs in category */}
              {expandedCategory === cat.key && (
                <div className="border-t border-zinc-100 divide-y divide-zinc-50">
                  {catDocs.map((doc) => {
                    const isExpired = doc.expiry_date && doc.expiry_date < today
                    const isExpiringSoon = doc.expiry_date && doc.expiry_date >= today && doc.expiry_date <= in30
                    const days = doc.expiry_date ? daysUntil(doc.expiry_date) : null
                    const typeInfo = cat.types.find((t) => t.key === doc.type)
                    const hasFile = !doc.storage_path?.startsWith('no-file/')

                    return (
                      <div key={doc.id} className="px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border ${colors.lightBg} ${colors.border}`}>
                            {cat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">{doc.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{typeInfo?.label ?? doc.type.replace(/_/g, ' ')}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                {isHR && doc.employee_id && (
                                  <span className="text-xs text-zinc-400">
                                    {employees.find((e) => e.id === doc.employee_id)?.full_name}
                                  </span>
                                )}
                                {isExpired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Expired</span>}
                                {isExpiringSoon && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Expires in {days}d</span>}
                                {doc.has_us_visa !== null && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${doc.has_us_visa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                                    US Visa: {doc.has_us_visa ? 'Yes' : 'No'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
                              {doc.document_number && <span>№ {doc.document_number}</span>}
                              {doc.nationality && <span>🌍 {doc.nationality}</span>}
                              {doc.issuer && <span>By {doc.issuer}</span>}
                              {doc.issued_date && <span>Issued {formatDate(doc.issued_date)}</span>}
                              {doc.expiry_date && (
                                <span className={isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : ''}>
                                  Expires {formatDate(doc.expiry_date)}
                                </span>
                              )}
                              {doc.size_bytes && <span>{formatBytes(doc.size_bytes)}</span>}
                            </div>
                            {doc.notes && <p className="mt-1 text-xs text-zinc-400 italic">"{doc.notes}"</p>}

                            {/* Actions */}
                            <div className="mt-2 flex items-center gap-2">
                              {hasFile && (
                                <button onClick={() => openDoc(doc)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Open
                                </button>
                              )}
                              {(isHR || doc.employee_id === currentUserId) && (
                                <button onClick={() => deleteDoc(doc)}
                                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
