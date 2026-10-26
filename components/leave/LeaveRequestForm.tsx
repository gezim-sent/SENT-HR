'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LeaveTypeConfig = {
  type: string
  label: string
  paid: boolean | null
  requires_document: boolean
  document_label: string | null
  approval_required: string
  deducts_balance: boolean
  gender_restriction: string | null
  notes: string | null
  default_days: number | null
}

type Props = {
  employeeId: string
  employeeName: string
  holidayDates: string[]
  leaveTypes: LeaveTypeConfig[]
  carriedOverDays: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = '.pdf, .jpg, .jpeg, .png, .webp'

function countBusinessDays(start: string, end: string, holidays: string[]): number {
  const s = new Date(start)
  const e = new Date(end)
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    const dateStr = cur.toISOString().split('T')[0]
    if (day !== 0 && day !== 6 && !holidays.includes(dateStr)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function LeaveRequestForm({
  employeeId,
  employeeName,
  holidayDates,
  leaveTypes,
  carriedOverDays,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    type: '',
    start_date: '',
    end_date: '',
    reason: '',
    return_date: '',
  })

  const selectedType = leaveTypes.find((t) => t.type === form.type)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    // Clear file if type changes and new type doesn't require document
    if (e.target.name === 'type') {
      setFile(null)
      setFileError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    setFileError(null)

    if (!selected) {
      setFile(null)
      return
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError('Only PDF, JPG, PNG or WEBP files are allowed.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Validate size
    if (selected.size > MAX_FILE_SIZE) {
      setFileError('File size must be under 10MB.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(selected)
  }

  function removeFile() {
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const daysCount =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? countBusinessDays(form.start_date, form.end_date, holidayDates)
      : null

  function validate(): string | null {
    if (!form.type) return 'Please select a leave type.'
    if (!form.start_date) return 'Please select a start date.'
    if (!form.end_date) return 'Please select an end date.'
    if (form.end_date < form.start_date) return 'End date must be after start date.'
    if (!form.return_date) return 'Return to work date is required.'
    if (form.return_date <= form.end_date) return 'Return date must be after end date.'
    if (daysCount === 0) return 'Selected dates fall on weekends or holidays only.'
    if (selectedType?.requires_document && !file) {
      const isSick = form.type === 'sick'
      const requiresDoc = isSick ? (daysCount ?? 0) >= 3 : true
      if (requiresDoc) return `Please upload the required document: ${selectedType.document_label}.`
    }
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError(null)
    setUploadProgress(0)

    const supabase = createClient()

    // Balance check — carried over days are deducted first for annual leave
    if (selectedType?.deducts_balance && (form.type === 'annual' || form.type === 'sick')) {
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', new Date().getFullYear())
        .single()

      if (balance) {
        const regularRemaining = form.type === 'annual'
          ? (balance as any).annual_total - (balance as any).annual_used
          : (balance as any).sick_total - (balance as any).sick_used

        // For annual leave, add carried over days to total available
        const totalAvailable = form.type === 'annual'
          ? regularRemaining + carriedOverDays
          : regularRemaining

        if ((daysCount ?? 0) > totalAvailable) {
          setError(
            form.type === 'annual' && carriedOverDays > 0
              ? `Insufficient balance. You have ${regularRemaining}d annual + ${carriedOverDays}d carried over = ${totalAvailable}d total remaining.`
              : `Insufficient balance. You have ${regularRemaining} ${form.type} days remaining.`
          )
          setLoading(false)
          return
        }
      }
    }

    // Upload document if provided
    let documentPath: string | null = null
    let documentName: string | null = null

    if (file) {
      setUploadProgress(10)
      const ext = file.name.split('.').pop()
      const fileName = `${employeeId}/${Date.now()}-${form.type}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setLoading(false)
        setUploadProgress(0)
        return
      }

      documentPath = uploadData.path
      documentName = file.name
      setUploadProgress(70)
    }

    // Insert leave request and get the ID back
    const { data: insertedData, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        type: form.type as any,
        start_date: form.start_date,
        end_date: form.end_date,
        return_date: form.return_date || null,
        days_count: daysCount!,
        reason: form.reason || null,
        status: 'pending',
        document_path: documentPath,
        document_name: documentName,
      } as any)
      .select('id')
      .single()

    setLoading(false)
    setUploadProgress(0)

    if (insertError) {
      // Rollback upload if insert fails
      if (documentPath) {
        await supabase.storage.from('leave-documents').remove([documentPath])
      }
      setError(insertError.message)
      return
    }

    // Send email to manager (fire and forget)
    if (insertedData?.id) {
      fetch('/api/email/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'submitted', leaveRequestId: insertedData.id }),
      }).catch(() => {}) // silently ignore email errors
    }

    setSuccess(true)
    setForm({ type: '', start_date: '', end_date: '', reason: '', return_date: '' })
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
    setTimeout(() => setSuccess(false), 4000)
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent placeholder:text-zinc-300'
  const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Request submitted successfully!
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Leave type */}
      <div>
        <label className={labelClass}>Leave Type *</label>
        <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
          <option value="">Select type…</option>
          {leaveTypes.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Carried over days reminder — shown inline without a box */}
      {form.type === 'annual' && carriedOverDays > 0 && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {carriedOverDays}d carried over from last year — will be deducted first
        </p>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Start Date *</label>
          <input
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End Date *</label>
          <input
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
            min={form.start_date || new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>
      </div>

      {/* Return date */}
      <div>
        <label className={labelClass}>Return to Work Date *</label>
        <input
          name="return_date"
          type="date"
          value={form.return_date}
          onChange={handleChange}
          min={form.end_date || undefined}
          className={inputClass}
        />
      </div>

      {/* Days count */}
      {daysCount !== null && (
        <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
          daysCount === 0
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {daysCount === 0
            ? 'No working days — falls on weekends/holidays'
            : `${daysCount} working day${daysCount !== 1 ? 's' : ''} (excluding weekends & public holidays)`}
        </div>
      )}

      {/* Reason */}
      <div>
        <label className={labelClass}>Reason (optional)</label>
        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          rows={2}
          placeholder="Brief description…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Document upload — sick leave only after 3+ days, other types always if requires_document */}
      {selectedType?.requires_document && (
        form.type === 'sick'
          ? (daysCount ?? 0) > 3
          : true
      ) && (
        <div>
          <label className={labelClass}>
            {selectedType.document_label} *
            {form.type === 'sick' && (
              <span className="text-zinc-400 font-normal ml-1">(required for sick leave over 3 days)</span>
            )}
          </label>

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700">Click to upload</p>
                <p className="text-xs text-zinc-400 mt-0.5">PDF, JPG, PNG or WEBP — max 10MB</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center flex-shrink-0">
                {file.type === 'application/pdf' ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-800 truncate">{file.name}</p>
                <p className="text-xs text-emerald-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-emerald-500 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-xs text-red-500 mt-1">{fileError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Upload progress */}
      {loading && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Uploading document…</span>
            <span className="text-xs text-zinc-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || daysCount === 0 || !form.return_date}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {file ? 'Uploading & submitting…' : 'Submitting…'}
          </span>
        ) : 'Submit Request'}
      </button>
    </form>
  )
}
