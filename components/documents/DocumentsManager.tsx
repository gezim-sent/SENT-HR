'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Document = {
  id: string
  created_at: string
  employee_id: string | null
  scope: 'company' | 'personal' | 'template'
  type: string
  name: string
  storage_path: string
  size_bytes: number | null
  expiry_date: string | null
  issued_date: string | null
  notes: string | null
  issuer: string | null
  employee?: { id: string; full_name: string; avatar_url: string | null; job_title: string | null; departments: { name: string } | null } | null
  uploader: { id: string; full_name: string } | null
}

const COMPANY_DOC_TYPES = [
  { value: 'policy',      label: 'Policy',              icon: '📋' },
  { value: 'other',       label: 'Announcement',        icon: '📣' },
  { value: 'certificate', label: 'Certification',       icon: '🏆' },
  { value: 'other',       label: 'Handbook',            icon: '📖' },
  { value: 'other',       label: 'Other',               icon: '📁' },
]

const TEMPLATE_DOC_TYPES = [
  { value: 'contract', label: 'Employment Contract',   icon: '📝' },
  { value: 'contract', label: 'NDA',                   icon: '🔒' },
  { value: 'contract', label: 'Annex Contract',        icon: '📎' },
  { value: 'policy',   label: 'Internal Regulation',   icon: '⚖️' },
  { value: 'other',    label: 'Other Template',        icon: '📄' },
]

const PERSONAL_DOC_TYPES = [
  { value: 'certificate', label: 'Medical Certificate',      icon: '🏥', requiresExpiry: true },
  { value: 'certificate', label: 'Professional Certificate', icon: '📜', requiresExpiry: true },
  { value: 'id',          label: 'ID / Passport',            icon: '🪪', requiresExpiry: true },
  { value: 'contract',    label: 'Employment Contract',      icon: '📋', requiresExpiry: false },
  { value: 'policy',      label: 'Policy Acknowledgement',   icon: '📄', requiresExpiry: false },
  { value: 'other',       label: 'Other',                    icon: '📁', requiresExpiry: false },
]

const TEMPLATE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Employment Contract': { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '📝' },
  'NDA':                 { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '🔒' },
  'Annex Contract':      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: '📎' },
  'Internal Regulation': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '⚖️' },
  'Other Template':      { bg: 'bg-zinc-50',   text: 'text-zinc-500',   border: 'border-zinc-200',   icon: '📄' },
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  certificate: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '📜' },
  id:          { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🪪' },
  contract:    { bg: 'bg-zinc-50',   text: 'text-zinc-600',   border: 'border-zinc-200',   icon: '📋' },
  policy:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: '📄' },
  other:       { bg: 'bg-zinc-50',   text: 'text-zinc-500',   border: 'border-zinc-200',   icon: '📁' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

type UploadScope = 'company' | 'personal' | 'template'

export default function DocumentsManager({
  companyDocs, personalDocs, templateDocs, expiring, expired,
  employees, currentUserId, currentUserName, isHR, today, in30,
  PersonalDocumentsComponent,
}: {
  companyDocs: Document[]
  personalDocs: Document[]
  templateDocs: Document[]
  expiring: any[]
  expired: any[]
  employees: any[]
  currentUserId: string
  currentUserName: string
  isHR: boolean
  today: string
  in30: string
  PersonalDocumentsComponent?: React.ComponentType<any>
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'company' | 'personal' | 'template' | 'expiring' | 'expired'>('company')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadScope, setUploadScope] = useState<UploadScope>('company')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [filterEmployee, setFilterEmployee] = useState('')

  const [form, setForm] = useState({
    employee_id: currentUserId,
    doc_label: '',
    doc_type: 'other',
    name: '',
    issued_date: '',
    expiry_date: '',
    issuer: '',
    notes: '',
  })

  const docTypes = uploadScope === 'company' ? COMPANY_DOC_TYPES : uploadScope === 'template' ? TEMPLATE_DOC_TYPES : PERSONAL_DOC_TYPES

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  function openUpload(scope: UploadScope) {
    setUploadScope(scope)
    setShowUpload(true)
    setFile(null)
    setError(null)
    setForm({ employee_id: currentUserId, doc_label: '', doc_type: 'other', name: '', issued_date: '', expiry_date: '', issuer: '', notes: '' })
  }

  async function handleUpload() {
    if (!file || !form.name) { setError('File and document name are required.'); return }
    if (uploadScope === 'personal' && !form.employee_id) { setError('Please select an employee.'); return }
    setUploading(true); setError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const folder = uploadScope === 'company' ? 'company' : form.employee_id
    const path = `${folder}/${Date.now()}-${form.doc_type}.${ext}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { error: insertError } = await supabase.from('documents').insert({
      scope: uploadScope,
      employee_id: uploadScope === 'personal' ? form.employee_id : null,
      type: form.doc_type as any,
      name: form.name,
      storage_path: path,
      uploaded_by: currentUserId,
      size_bytes: file.size,
      issued_date: form.issued_date || null,
      expiry_date: form.expiry_date || null,
      issuer: form.issuer || null,
      notes: form.notes || null,
    } as any)

    setUploading(false)
    if (insertError) { setError(insertError.message); return }

    setShowUpload(false)
    setFile(null)
    router.refresh()
  }

  async function openDocument(doc: Document) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteDocument(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    const supabase = createClient()
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    router.refresh()
  }

  const filteredPersonal = filterEmployee
    ? personalDocs.filter((d) => d.employee_id === filterEmployee)
    : personalDocs

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'
  const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Documents</h1>
          <p className="text-sm mt-0.5 text-zinc-400">Company documents and personal employee files.</p>
        </div>
        <div className="flex items-center gap-2">
          {isHR && (
            <button
              onClick={() => openUpload('template')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              📝 Template
            </button>
          )}
          {isHR && (
            <button
              onClick={() => openUpload('company')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Company Doc
            </button>
          )}
        </div>
      </div>

      {/* Expiry alerts — HR only */}
      {isHR && (expiring.length > 0 || expired.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expiring.length > 0 && (
            <button onClick={() => setActiveTab('expiring')}
              className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-left">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">{expiring.length} document{expiring.length !== 1 ? 's' : ''} expiring soon</p>
                <p className="text-xs text-amber-700 mt-0.5">Within the next 60 days</p>
              </div>
            </button>
          )}
          {expired.length > 0 && (
            <button onClick={() => setActiveTab('expired')}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors text-left">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-sm font-semibold text-red-900">{expired.length} expired document{expired.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-red-700 mt-0.5">Require renewal</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Upload {uploadScope === 'company' ? '🏢 Company' : uploadScope === 'template' ? '📝 Template' : '👤 Personal'} Document
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {uploadScope === 'company'
                  ? 'Visible to all employees'
                  : uploadScope === 'template'
                  ? 'Contract/NDA templates — accessible by HR and Admin only'
                  : 'Private — visible to the employee and HR only'}
              </p>
            </div>
            <button onClick={() => setShowUpload(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee selector — personal only, HR only */}
              {uploadScope === 'personal' && isHR && (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Employee *</label>
                  <select name="employee_id" value={form.employee_id} onChange={handleFormChange} className={inputClass}>
                    <option value={currentUserId}>{currentUserName} (me)</option>
                    {employees.filter((e) => e.id !== currentUserId).map((e) => (
                      <option key={e.id} value={e.id}>{e.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Document type */}              <div className="sm:col-span-2">
                <label className={labelClass}>Document Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {docTypes.map((dt) => (
                    <button key={dt.label} type="button"
                      onClick={() => setForm((p) => ({ ...p, doc_label: dt.label, doc_type: dt.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                        form.doc_label === dt.label
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <span>{dt.icon}</span><span className="leading-tight">{dt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Document Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Employee Handbook 2026" className={inputClass} />
              </div>

              {uploadScope === 'personal' && (
                <>
                  <div>
                    <label className={labelClass}>Issued By</label>
                    <input name="issuer" value={form.issuer} onChange={handleFormChange} placeholder="Issuing authority" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Issue Date</label>
                    <input name="issued_date" type="date" value={form.issued_date} onChange={handleFormChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry Date</label>
                    <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleFormChange} min={today} className={inputClass} />
                  </div>
                </>
              )}

              <div className={uploadScope === 'personal' ? '' : 'sm:col-span-2'}>
                <label className={labelClass}>Notes</label>
                <input name="notes" value={form.notes} onChange={handleFormChange} placeholder="Optional notes" className={inputClass} />
              </div>

              {/* File upload */}
              <div className="sm:col-span-2">
                <label className={labelClass}>File *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                      <svg className="w-8 h-8 text-zinc-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-zinc-500">Click to upload</p>
                      <p className="text-xs text-zinc-400 mt-1">PDF, JPG, PNG · Max 10MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleUpload} disabled={uploading || !file || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Upload Document'}
              </button>
              <button onClick={() => setShowUpload(false)}
                className="px-4 py-2.5 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 w-fit flex-wrap">
        {([
          { key: 'company',  label: `🏢 Company (${companyDocs.length})` },
          { key: 'personal', label: `👤 Personal (${personalDocs.length})` },
          ...(isHR ? [{ key: 'template', label: `📝 Templates (${templateDocs.length})` }] : []),
          ...(isHR && expiring.length > 0  ? [{ key: 'expiring', label: `⏰ Expiring (${expiring.length})` }] : []),
          ...(isHR && expired.length > 0   ? [{ key: 'expired',  label: `❌ Expired (${expired.length})` }]  : []),
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Company documents */}
      {activeTab === 'company' && (
        <DocList
          docs={companyDocs}
          today={today}
          in30={in30}
          isHR={isHR}
          currentUserId={currentUserId}
          onOpen={openDocument}
          onDelete={deleteDocument}
          emptyText="No company documents yet."
          emptyHint={isHR ? 'Upload a handbook, policy or announcement for all employees.' : undefined}
        />
      )}

      {/* Personal documents — use dedicated component */}
      {activeTab === 'personal' && (
        PersonalDocumentsComponent ? (
          <PersonalDocumentsComponent
            docs={personalDocs}
            employees={employees}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            isHR={isHR}
            today={today}
            in30={in30}
          />
        ) : null
      )}

      {/* Templates — HR/Admin only */}
      {activeTab === 'template' && isHR && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-800">
              Templates are only visible to <strong>HR and Admin</strong>. Upload contract templates, NDAs, annex contracts and internal regulations here.
            </p>
          </div>
          <DocList
            docs={templateDocs}
            today={today}
            in30={in30}
            isHR={isHR}
            currentUserId={currentUserId}
            onOpen={openDocument}
            onDelete={deleteDocument}
            showEmployee={false}
            emptyText="No templates uploaded yet."
            emptyHint="Upload contract templates, NDAs, annex contracts or internal regulations."
            labelMap={Object.fromEntries(TEMPLATE_DOC_TYPES.map((t) => [t.label, t]))}
          />
        </div>
      )}

      {/* Expiring */}
      {activeTab === 'expiring' && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Expiring Soon</h2>
          </div>
          {expiring.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-400">No documents expiring soon 🎉</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {expiring.map((doc: any) => {
                const days = daysUntil(doc.expiry_date)
                return (
                  <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {doc.employee?.avatar_url
                        ? <img src={doc.employee.avatar_url} alt={doc.employee.full_name} className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center"><span className="text-xs font-semibold text-zinc-600">{doc.employee?.full_name?.[0]}</span></div>
                      }
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{doc.name}</p>
                        <p className="text-xs text-zinc-400">{doc.employee?.full_name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${days <= 14 ? 'text-red-600' : 'text-amber-600'}`}>
                        {days === 0 ? 'Expires today' : `${days}d left`}
                      </p>
                      <p className="text-xs text-zinc-400">{formatDate(doc.expiry_date)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Expired */}
      {activeTab === 'expired' && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Expired Documents</h2>
          </div>
          {expired.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-400">No expired documents.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {expired.map((doc: any) => (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {doc.employee?.avatar_url
                      ? <img src={doc.employee.avatar_url} alt={doc.employee.full_name} className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center"><span className="text-xs font-semibold text-zinc-600">{doc.employee?.full_name?.[0]}</span></div>
                    }
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{doc.name}</p>
                      <p className="text-xs text-zinc-400">{doc.employee?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                      Expired {Math.abs(daysUntil(doc.expiry_date))}d ago
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatDate(doc.expiry_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DocList({ docs, today, in30, isHR, currentUserId, onOpen, onDelete, showEmployee, emptyText, emptyHint, labelMap }: {
  docs: Document[]
  today: string
  in30: string
  isHR: boolean
  currentUserId: string
  onOpen: (doc: Document) => void
  onDelete: (doc: Document) => void
  showEmployee?: boolean
  emptyText: string
  emptyHint?: string
  labelMap?: Record<string, { icon: string; label: string }>
}) {
  if (docs.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
        <p className="text-2xl mb-3">📄</p>
        <p className="text-sm font-medium text-zinc-900">{emptyText}</p>
        {emptyHint && <p className="text-xs text-zinc-400 mt-1">{emptyHint}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="divide-y divide-zinc-50">
        {docs.map((doc) => {
          const style = TYPE_STYLES[doc.type] ?? TYPE_STYLES.other
          const isExpired = doc.expiry_date && doc.expiry_date < today
          const isExpiringSoon = doc.expiry_date && doc.expiry_date >= today && doc.expiry_date <= in30
          const days = doc.expiry_date ? daysUntil(doc.expiry_date) : null

          return (
            <div key={doc.id} className="px-5 py-4 hover:bg-zinc-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${style.bg} ${style.border}`}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{doc.name}</p>
                      {showEmployee && doc.employee && (
                        <p className="text-xs text-zinc-400 mt-0.5">{doc.employee.full_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${style.bg} ${style.text} ${style.border}`}>
                        {doc.type}
                      </span>
                      {isExpired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Expired</span>}
                      {isExpiringSoon && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Expires in {days}d</span>}
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
                    {doc.issuer && <span>By {doc.issuer}</span>}
                    {doc.issued_date && <span>Issued {formatDate(doc.issued_date)}</span>}
                    {doc.expiry_date && (
                      <span className={isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : ''}>
                        Expires {formatDate(doc.expiry_date)}
                      </span>
                    )}
                    {doc.size_bytes && <span>{formatBytes(doc.size_bytes)}</span>}
                    <span>Uploaded {formatDate(doc.created_at)}{doc.uploader ? ` by ${doc.uploader.full_name}` : ''}</span>
                  </div>

                  {doc.notes && <p className="mt-1 text-xs text-zinc-400 italic">"{doc.notes}"</p>}

                  <div className="mt-2.5 flex items-center gap-2">
                    <button onClick={() => onOpen(doc)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </button>
                    {(isHR || doc.employee_id === currentUserId) && (
                      <button onClick={() => onDelete(doc)}
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
    </div>
  )
}
