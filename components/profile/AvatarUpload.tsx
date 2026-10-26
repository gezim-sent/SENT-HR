'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string
  currentAvatarUrl: string | null
  fullName: string
}

export default function AvatarUpload({ userId, currentAvatarUrl, fullName }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Only JPG, PNG, WEBP or GIF allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }

    setError(null)
    setUploading(true)

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const filePath = `${userId}/avatar.${ext}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setError(uploadError.message)
      setPreview(currentAvatarUrl)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Add cache-busting timestamp
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    setUploading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setPreview(avatarUrl)
    router.refresh()
  }

  async function handleRemove() {
    if (!confirm('Remove your profile photo?')) return
    setUploading(true)
    const supabase = createClient()

    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    setPreview(null)
    setUploading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        {preview ? (
          <img
            src={preview}
            alt={fullName}
            className="w-20 h-20 rounded-xl object-cover border border-zinc-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-zinc-900 flex items-center justify-center">
            <span className="text-xl font-semibold text-white">{initials}</span>
          </div>
        )}

        {/* Upload overlay on hover */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>

          {preview && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-400">JPG, PNG, WEBP or GIF · Max 5MB</p>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
