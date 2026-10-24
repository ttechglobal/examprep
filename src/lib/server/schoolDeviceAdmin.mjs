// Injectable boundary: auth is checked before service-role database access.
export function schoolDeviceAdminHandlers({ adminContext, actorOf, supabaseAdmin, memo = (_key, _ttl, load) => load(), forget = () => {} }) {
  const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
  return {
    async GET(request) {
      const { admin, error } = await adminContext()
      if (error) return error
      try {
        const days = Number(new URL(request?.url || 'http://localhost').searchParams.get('days')) || 30
        const db = supabaseAdmin()
        const period = [1, 7, 30, 90].includes(days) ? days : 30
        const checked = async promise => { const result = await promise; if (result.error) throw result.error; return result }
        const [list, usage] = await Promise.all([
          memo('desktop-schools:list', 60_000, () => checked(db.rpc('desktop_school_service_admin', { p_action: 'list', p_input: {}, p_actor: JSON.stringify(actorOf(admin)) }))),
          memo(`desktop-schools:usage:${period}`, 300_000, () => checked(db.rpc('desktop_school_usage_summary', { p_days: period }))).catch(() => ({ error: true })),
        ])
        const { data, error: failure } = list
        if (failure) throw failure
        return reply({ ...data, canManage: admin.owner === true, usage: usage.error ? null : usage.data, usageAvailable: !usage.error })
      } catch {
        return reply({ error: 'Could not load desktop school activations. Check that the activation migration has been deployed.' }, 503)
      }
    },
    async POST(request) {
      const { admin, error } = await adminContext({ owner: true })
      if (error) return error
      if (!request.headers.get('origin') || request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'A same-origin JSON request is required.' }, 403)
      try {
        const text = await request.text()
        if (text.length > 8000) return reply({ error: 'Request too large' }, 413)
        const body = JSON.parse(text)
        if (!['verify-school', 'approve', 'reject', 'revoke', 'replace', 'contact-purchase', 'confirm-payment', 'close-purchase'].includes(body.action) || !body.input || typeof body.input !== 'object' || Array.isArray(body.input)) return reply({ error: 'Invalid activation action' }, 400)
        const reason = body.input.reason?.trim()
        if (typeof reason !== 'string' || reason.length < 3 || reason.length > 1000) return reply({ error: 'Enter an audit reason of 3–1,000 characters.' }, 400)
        const { data, error: failure } = await supabaseAdmin().rpc('desktop_school_service_admin', { p_action: body.action, p_input: { ...body.input, reason }, p_actor: JSON.stringify(actorOf(admin)) })
        if (failure) return reply({ error: failure.code === 'P0001' ? failure.message : 'Could not save the activation. Check the deployment and try again.' }, 400)
        forget('desktop-schools:')
        return reply(data)
      } catch {
        return reply({ error: 'Could not process the activation request.' }, 400)
      }
    },
  }
}
