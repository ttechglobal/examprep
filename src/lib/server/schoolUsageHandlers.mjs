export function schoolUsageHandlers({ supabaseAdmin, rateLimited, verifyProof }) {
  const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
  return async function POST(request) {
    const limited = rateLimited(request, 'desktop-school-usage', 1200, 60 * 60_000)
    if (limited) return limited
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ ok: false, message: 'Send a JSON usage report.' }, 415)
    try {
      const text = await request.text()
      if (Buffer.byteLength(text) > 48000) return reply({ ok: false, message: 'Usage report too large.' }, 413)
      const body = JSON.parse(text)
      if (body?.action === 'challenge') {
        if (!/^[0-9a-f]{64}$/.test(body.device_id)) return reply({ ok: false, message: 'Invalid device.' }, 400)
        const { data, error } = await supabaseAdmin().rpc('desktop_activation_challenge', { p_device: body.device_id, p_bucket: `usage:${body.device_id}` })
        if (error) return reply({ ok: false, message: 'Usage reporting is temporarily unavailable.' }, 503)
        return reply(data)
      }
      if (body?.action !== 'execute') return reply({ ok: false, message: 'Invalid usage request.' }, 400)
      let proof
      try { proof = await verifyProof(body.payload, body.signature) }
      catch { return reply({ ok: false, message: 'Could not verify this computer’s usage report.' }, 403) }
      const { data, error } = await supabaseAdmin().rpc('desktop_school_usage_report', {
        p_device: proof.device, p_input: proof.input, p_nonce: proof.nonce,
      })
      if (error) return reply({ ok: false, message: error.code === 'P0001' ? error.message : 'Usage report could not be saved.' }, error.code === 'P0001' ? 400 : 503)
      return reply(data)
    } catch { return reply({ ok: false, message: 'Invalid usage report.' }, 400) }
  }
}
