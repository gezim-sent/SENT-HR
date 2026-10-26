'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Equipment = {
  id: string
  name: string
  type: string
  serial_number: string | null
  assigned_date: string
  condition: string
  notes: string | null
}

type Props = {
  equipment: Equipment[]
  employeeId: string
  canManage: boolean
}

const EQUIPMENT_TYPES = [
  'laptop', 'monitor', 'keyboard', 'mouse', 'headset',
  'phone', 'tablet', 'desk', 'chair', 'other'
]

const CONDITION_OPTIONS = ['new', 'good', 'fair', 'poor']

const typeIcons: Record<string, string> = {
  laptop: '💻', monitor: '🖥️', keyboard: '⌨️', mouse: '🖱️',
  headset: '🎧', phone: '📱', tablet: '📲', desk: '🪑',
  chair: '🪑', other: '📦',
}

const conditionStyles: Record<string, string> = {
  new:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  good: 'bg-blue-50 text-blue-700 border-blue-200',
  fair: 'bg-amber-50 text-amber-700 border-amber-200',
  poor: 'bg-red-50 text-red-700 border-red-200',
}

export default function EquipmentSection({ equipment, employeeId, canManage }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    type: 'laptop',
    serial_number: '',
    assigned_date: new Date().toISOString().split('T')[0],
    condition: 'good',
    notes: '',
  })

  const router = useRouter()
  const supabase = createClient()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleAdd() {
    if (!form.name) { setError('Equipment name is required.'); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('equipment' as any)
      .insert({
        employee_id: employeeId,
        name: form.name,
        type: form.type,
        serial_number: form.serial_number || null,
        assigned_date: form.assigned_date,
        condition: form.condition,
        notes: form.notes || null,
      })

    setLoading(false)
    if (error) { setError(error.message); return }

    setShowForm(false)
    setForm({ name: '', type: 'laptop', serial_number: '', assigned_date: new Date().toISOString().split('T')[0], condition: 'good', notes: '' })
    router.refresh()
  }

  async function handleReturn(id: string) {
    await supabase
      .from('equipment' as any)
      .update({ returned_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    router.refresh()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
  const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">Equipment</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{equipment.length} item{equipment.length !== 1 ? 's' : ''} assigned</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Equipment
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && canManage && (
        <div className="p-5 border-b border-zinc-100 bg-zinc-50 space-y-4">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. MacBook Pro 14" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="Optional" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Assigned Date</label>
              <input name="assigned_date" type="date" value={form.assigned_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Condition</label>
              <select name="condition" value={form.condition} onChange={handleChange} className={inputClass}>
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Equipment'}
            </button>
          </div>
        </div>
      )}

      {/* Equipment list */}
      {equipment.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">No equipment assigned yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {equipment.map((item) => (
            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{typeIcons[item.type] ?? '📦'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-400 capitalize">{item.type}</p>
                    {item.serial_number && (
                      <span className="text-xs text-zinc-300">· {item.serial_number}</span>
                    )}
                    <span className="text-xs text-zinc-300">
                      · Assigned {new Date(item.assigned_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${conditionStyles[item.condition] ?? conditionStyles.good}`}>
                  {item.condition}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleReturn(item.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors ml-1"
                    title="Mark as returned"
                  >
                    Return
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
