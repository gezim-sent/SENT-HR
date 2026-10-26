'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Equipment = {
  id: string
  name: string
  type: string
  serial_number: string | null
  condition: string
  assigned_date: string
  returned_date: string | null
  notes: string | null
}

export default function EmployeeEquipment({
  equipment,
  employeeId,
  canManage,
}: {
  equipment: Equipment[]
  employeeId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'laptop', serial_number: '', condition: 'good', notes: '',
  })

  async function handleAdd() {
    if (!form.name) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('equipment' as any).insert({
      employee_id: employeeId,
      name: form.name,
      type: form.type,
      serial_number: form.serial_number || null,
      condition: form.condition,
      notes: form.notes || null,
      assigned_date: new Date().toISOString().split('T')[0],
    })
    setLoading(false)
    setShowAdd(false)
    setForm({ name: '', type: 'laptop', serial_number: '', condition: 'good', notes: '' })
    router.refresh()
  }

  async function handleReturn(id: string) {
    if (!confirm('Mark this equipment as returned?')) return
    const supabase = createClient()
    await supabase.from('equipment' as any).update({
      returned_date: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    router.refresh()
  }

  const active = equipment.filter((e) => !e.returned_date)
  const returned = equipment.filter((e) => e.returned_date)

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-900">Equipment</h2>
        {canManage && (
          <button
            onClick={() => setShowAdd((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign
          </button>
        )}
      </div>

      {showAdd && (
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder='MacBook Pro 14"' className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputClass}>
                {['laptop', 'phone', 'monitor', 'keyboard', 'mouse', 'headset', 'other'].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Serial Number</label>
              <input value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} placeholder="Optional" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Condition</label>
              <select value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))} className={inputClass}>
                {['excellent', 'good', 'fair', 'poor'].map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50">
              {loading ? 'Adding…' : 'Assign Equipment'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-400">No equipment assigned.</div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {active.map((item) => (
            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">
                    {item.type === 'laptop' ? '💻' : item.type === 'phone' ? '📱' : item.type === 'monitor' ? '🖥️' : item.type === 'headset' ? '🎧' : '🖱️'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                  <p className="text-xs text-zinc-400 capitalize">
                    {item.type}{item.serial_number ? ` · ${item.serial_number}` : ''} · {item.condition}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-zinc-400">
                  Since {new Date(item.assigned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleReturn(item.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Return
                  </button>
                )}
              </div>
            </div>
          ))}
          {returned.length > 0 && (
            <div className="px-5 py-2 bg-zinc-50">
              <p className="text-xs text-zinc-400">{returned.length} item{returned.length !== 1 ? 's' : ''} returned</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
