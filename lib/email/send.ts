// ─── Email sender using Resend ────────────────────────────────────────────────

type SendEmailParams = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sent People HR <hr@sent.dm>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[Email] Send failed:', err)
      return false
    }

    console.log('[Email] Sent to:', to, '|', subject)
    return true
  } catch (err) {
    console.error('[Email] Unexpected error:', err)
    return false
  }
}
