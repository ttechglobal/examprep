'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './schoolDevices.module.css'

const VIEWS = [['overview', 'Overview'], ['schools', 'Schools'], ['computers', 'Computers'], ['payments', 'Payments'], ['usage', 'Usage']]
const accessState = d => d.state === 'active' && d.expires_at && Date.parse(d.expires_at) <= Date.now() ? 'expired' : d.state
const number = value => Number(value || 0).toLocaleString()

function Drawer({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} aria-label={title} className={styles.drawer} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.drawerBody}><header><div><p className={styles.eyebrow}>SCHOOLS (DESKTOP)</p><h2>{title}</h2></div><button type="button" className={styles.quiet} onClick={onClose} aria-label="Close panel">✕</button></header>{children}</div>
  </dialog>
}

const date = value => value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }) : 'Permanent'
async function api(action, input, days = 30) {
  const response = await fetch(`/api/admin/school-devices?days=${days}`, action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, input }) } : { cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not load school activations')
  return data
}
export default function SchoolDevicesPage() {
  const [data, setData] = useState({ schools: [], devices: [], purchases: [], canManage: false })
  const [view, setView] = useState('overview')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [computerFilter, setComputerFilter] = useState('all')
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [device, setDevice] = useState('')
  const [kind, setKind] = useState('free')
  const [months, setMonths] = useState('3')
  const [reason, setReason] = useState('')
  const [payment, setPayment] = useState('')
  const [source, setSource] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [paidCount, setPaidCount] = useState('1')
  const [paidMonths, setPaidMonths] = useState('12')
  const loadVersion = useRef(0)
  const load = useCallback(async () => {
    const version = ++loadVersion.current
    setBusy(true)
    try {
      const result = await api(null, null, days)
      if (version === loadVersion.current) { setData({ ...result, loaded: true }); setMessage('') }
    } catch (error) { if (version === loadVersion.current) setMessage(error.message) }
    finally { if (version === loadVersion.current) setBusy(false) }
  }, [days])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const schools = useMemo(() => new Map(data.schools.map(s => [s.id, s])), [data.schools])
  const shown = data.devices.filter(d => (!schoolFilter || d.school_id === schoolFilter)).filter(d => computerFilter === 'all' || (computerFilter === 'requests' ? d.request_status === 'pending' : accessState(d) === computerFilter)).filter(d => `${schools.get(d.school_id)?.name} ${schools.get(d.school_id)?.email} ${d.computer_id}`.toLowerCase().includes(search.toLowerCase()))
  const deviceUsage = new Map((data.usage?.devices || []).map(row => [row.device_id, row]))
  const totals = data.usage?.totals || {}
  const selected = data.devices.find(d => d.id === device)
  async function act(action, input) {
    setBusy(true); setMessage('')
    try { await api(action, input); await load(); setMessage(action === 'confirm-payment' ? 'Payment recorded.' : action === 'contact-purchase' ? 'Marked contacted.' : 'Saved.'); setDevice(''); setPurchaseId(''); setReason('') }
    catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }
  const purchases = data.purchases || []
  const chosenPurchase = purchases.find(p => p.id === purchaseId)
  const grants = purchases.filter(p => p.school_id === selected?.school_id && p.status === 'paid' && p.paid_quantity > Number(p.seats_used))
  function selectPurchase(p) { setMessage(''); setReason(''); setPurchaseId(p.id); setPaidCount(String(p.quantity)); setPaidMonths('12'); setPayment('') }
  const pendingDevices = data.devices.filter(d => d.request_status === 'pending')
  const pendingPayments = purchases.filter(p => ['requested', 'contacted'].includes(p.status))
  const activeDevices = data.devices.filter(d => accessState(d) === 'active')
  function openView(next) { setView(next); setSearch(''); setSchoolFilter(''); setComputerFilter('all'); setDevice(''); setPurchaseId('') }
  function openComputer(d) { setMessage(''); setView('computers'); setDevice(d.id); setKind(d.kind === 'paid' ? 'paid' : 'free'); setOrderId(''); setSource(''); setReason('') }
  const permitted = data.canManage && !busy
  return <div className={styles.page} aria-busy={busy}>
    <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SCHOOL MANAGEMENT</p><h1 style={{ fontWeight: 800 }}><strong>Schools (Desktop)</strong></h1><p>Schools, computers and access at a glance.</p></div><button className={styles.quiet} disabled={busy} onClick={load}>{busy ? 'Refreshing…' : 'Refresh'}</button></header>
    <nav className={styles.nav} aria-label="Desktop school sections">{VIEWS.map(([id, label]) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} className={view === id ? styles.navOn : ''} onClick={() => openView(id)}>{label}{id === 'computers' && pendingDevices.length > 0 && <span>{pendingDevices.length}</span>}{id === 'payments' && pendingPayments.length > 0 && <span>{pendingPayments.length}</span>}</button>)}</nav>
    {(data.schools.length >= 200 || data.devices.length >= 1000 || (data.purchases || []).length >= 1000) && <p role="status" className={styles.message}>The directory reached its current list limit. Counts on this page describe loaded records and may omit older schools, computers or payment requests.</p>}
    {message && <p role="status" className={styles.message}>{message}</p>}
    {busy && !data.loaded && <p role="status">Loading schools…</p>}
    {view === 'overview' && <>
      <div className={styles.overviewStats}>
        {[[data.schools.length, 'Registered schools', 'schools'], [data.devices.length, 'Installed computers', 'computers'], [activeDevices.length, 'Activated computers', 'computers', 'active'], [pendingDevices.length, 'Activation requests', 'computers', 'requests']].map(([value, label, target, filter]) => <button type="button" key={label} onClick={() => { openView(target); if (filter) setComputerFilter(filter) }}><span>{label}</span><strong>{data.loaded ? number(value) : '—'}</strong><small>View {target} <span aria-hidden="true">↗</span></small></button>)}
      </div>
      <div className={styles.overviewGrid}>
        <section><div className={styles.heading}><h2>Needs attention</h2><span className={styles.count}>{pendingDevices.length + pendingPayments.length}</span></div>
          {!data.loaded ? <div className={styles.empty}>Loading requests…</div> : !pendingDevices.length && !pendingPayments.length ? <div className={styles.empty}><strong>No pending requests</strong><p>New activation and payment requests appear here.</p></div> : <div className={styles.attentionList}>
            {pendingDevices.slice(0, 4).map(d => <button key={d.id} type="button" onClick={() => openComputer(d)}><span><strong>{d.computer_id}</strong><small>{schools.get(d.school_id)?.name} · {d.kind === 'paid' ? 'Paid' : 'Complimentary'} activation</small></span><span aria-hidden="true">→</span></button>)}
            {pendingPayments.slice(0, 3).map(p => <button key={p.id} type="button" onClick={() => { openView('payments'); selectPurchase(p) }}><span><strong>{schools.get(p.school_id)?.name}</strong><small>Payment enquiry · {p.quantity} computers</small></span><span aria-hidden="true">→</span></button>)}
          </div>}
        </section>
        <section><div className={styles.heading}><h2>Explore</h2></div><div className={styles.explore}>
          {[[ 'schools', 'School directory', 'Contact details and registered computers.'], ['computers', 'Computers & activation', 'Review requests, renew or replace a computer.'], ['payments', 'Payments', 'Follow up enquiries and record confirmed payments.'], ['usage', 'Usage & feedback', 'See practice activity reported by school computers.']].map(([id, label, description]) => <button key={id} type="button" onClick={() => openView(id)}><span><strong>{label}</strong><small>{description}</small></span><span aria-hidden="true">↗</span></button>)}
        </div></section>
      </div>
      <section><div className={styles.heading}><h2>Recently registered schools</h2><button type="button" className={styles.quiet} onClick={() => openView('schools')}>View all schools →</button></div>{data.schools.length ? <div className={styles.recentSchools}>{data.schools.slice(0,5).map(s => <button type="button" key={s.id} onClick={() => { openView('computers'); setSchoolFilter(s.id) }}><span className={styles.schoolInitial}>{s.name?.trim()[0] || 'S'}</span><span><strong>{s.name}</strong><small>{s.contact?.state || 'School details saved'}</small></span><span className={styles.recentCount}>{data.devices.filter(d => d.school_id === s.id).length} computers →</span></button>)}</div> : <div className={styles.empty}>{data.loaded ? 'No schools registered yet.' : 'Loading schools…'}</div>}</section>
    </>}
    {view === 'usage' && <>
    <section aria-labelledby="school-usage-title">
      {busy && <p role="status">Updating usage…</p>}
      <div className={styles.heading}><h2 id="school-usage-title">School usage</h2><label>Reporting period<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
      {data.usageAvailable ? <>
        <div className={styles.stats}>
          <div><strong>{Number(totals.sessions_completed || 0).toLocaleString()}</strong><span>Completed sessions</span></div>
          <div><strong>{Number(totals.questions_answered || 0).toLocaleString()}</strong><span>Questions answered</span></div>
          <div><strong>{Number(totals.practising_computers || 0).toLocaleString()}</strong><span>Computers reporting practice</span></div>
          <div><strong>{Number(totals.feedback_count || 0).toLocaleString()}</strong><span>Question feedback reports</span></div>
        </div>
        {data.usage?.averages && <><h3>Typical usage · last 90 days</h3><div className={styles.stats}>{[['Daily',1],['Weekly',7],['Monthly (30 days)',30]].map(([label,scale]) => <div key={label}><strong>{(data.usage.averages.sessions_per_day * scale).toFixed(2)}</strong><span>{label} sessions</span><small>{(data.usage.averages.questions_per_day * scale).toFixed(2)} questions · {(data.usage.averages.minutes_per_day * scale).toFixed(2)} minutes</small></div>)}</div><p>Average across all registered computers over 90 days, including days with no reports. Monthly means 30 days; new installations have a shorter reporting history.</p></>}
        {!!data.usage?.modes?.length && <p>{data.usage.modes.map(m => `${m.event_type === 'computer_battle' ? 'Battle vs computer' : m.event_type === 'friend_battle' ? 'Battle vs friends' : 'Practice'}: ${number(m.sessions)} sessions`).join(' · ')}</p>}
        <p>Counts cover received reports for the selected period; 24 hours is rolling, longer periods use Lagos dates. Sessions are not unique students. Offline computers upload when connected; “No report yet” does not mean unused.</p>
        {!!data.usage?.feedback?.length && <details><summary>Feedback by school</summary><table><thead><tr><th>School</th><th>Feedback reason</th><th>Reports</th></tr></thead><tbody>{data.usage.feedback.map(f => <tr key={`${f.school_id}:${f.feedback_reason}`}><td>{schools.get(f.school_id)?.name || 'School outside current list'}</td><td>{f.feedback_reason}</td><td>{f.reports}</td></tr>)}</tbody></table></details>}
      </> : <p>Usage reporting is not connected yet. Registration and activation management remain available.</p>}
    </section>
    <section><h2>Computer activity</h2><div className={styles.scroll}><table><thead><tr><th>School / computer</th><th>Sessions</th><th>Questions answered</th><th>Feedback</th><th>Last practice</th><th>Last upload</th></tr></thead><tbody>{data.devices.map(d => { const u = deviceUsage.get(d.id); return <tr key={d.id}><td><strong>{d.computer_id}</strong><small>{schools.get(d.school_id)?.name}</small></td><td>{u?.last_reported_at ? number(u.sessions_completed) : '—'}</td><td>{u?.last_reported_at ? number(u.questions_answered) : '—'}</td><td>{u?.last_reported_at ? number(u.feedback_count) : '—'}</td><td>{u?.last_practice_at ? date(u.last_practice_at) : 'No practice reported'}</td><td>{u?.last_reported_at ? date(u.last_reported_at) : 'No report yet'}</td></tr> })}{!data.devices.length && <tr><td colSpan={6}>No registered computers yet.</td></tr>}</tbody></table></div></section>
    </>}
    {view === 'payments' && <>
    <section><h2>Payment requests</h2><p>Follow up school enquiries and record confirmed payments.</p>
      <div className={styles.scroll}><table><thead><tr><th>School / contact</th><th>Requested computers</th><th>Payment</th><th>Paid places used</th><th>Manage</th></tr></thead><tbody>
        {purchases.map(p => <tr key={p.id}><td><strong>{schools.get(p.school_id)?.name}</strong><small>{schools.get(p.school_id)?.email}</small><small>{schools.get(p.school_id)?.contact?.school_phone} · {schools.get(p.school_id)?.contact?.contact_phone}</small></td><td>{p.quantity}</td><td>{p.status}<small>{p.payment_reference}</small></td><td>{p.status === 'paid' || p.paid_quantity ? `${p.seats_used} / ${p.paid_quantity} · ${p.months === 0 ? 'Permanent' : `${p.months} months`}` : 'Not confirmed'}</td><td><button disabled={!permitted} onClick={() => selectPurchase(p)}>Select payment request</button></td></tr>)}
        {!busy && !purchases.length && <tr><td colSpan={5}>No payment enquiries yet.</td></tr>}
      </tbody></table></div>
    </section>
    {chosenPurchase && <Drawer title={schools.get(chosenPurchase.school_id)?.name || 'Payment request'} onClose={() => setPurchaseId('')}><p>{chosenPurchase.quantity} computers requested · {chosenPurchase.status}</p>{message && <p role="alert" className={styles.message}>{message}</p>}

      <form onSubmit={event => { event.preventDefault(); act('confirm-payment', { purchase_id: purchaseId, paid_quantity: Number(paidCount), months: Number(paidMonths), payment_reference: payment, reason }) }}>
        <div className={styles.grid}>

          <label>Computers actually paid for<input required type="number" min="1" max="100" value={paidCount} onChange={e => setPaidCount(e.target.value)} /></label>
          <label>Purchased duration<select value={paidMonths} onChange={e => setPaidMonths(e.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="12">1 year</option><option value="0">Permanent — deliberate exception</option></select></label>
          <label>Verified bank/payment reference<input required minLength={3} maxLength={160} value={payment} onChange={e => setPayment(e.target.value)} /></label>
        </div>
        <label>Note<textarea required minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>

        <div className={styles.actions}>
          <button type="button" disabled={!permitted || !chosenPurchase || !['requested', 'contacted'].includes(chosenPurchase.status)} onClick={() => act('contact-purchase', { purchase_id: purchaseId, reason })}>Mark contacted</button>
          <button type="submit" disabled={!permitted || !chosenPurchase || !['requested', 'contacted'].includes(chosenPurchase.status)}>Confirm payment</button>
          <button type="button" disabled={!permitted || !chosenPurchase || chosenPurchase.status === 'closed'} onClick={() => { if (window.confirm('Close this enquiry? Any unused paid places become unavailable. Already approved computers retain their term.')) act('close-purchase', { purchase_id: purchaseId, reason }) }}>Close enquiry</button>
        </div>
      </form>
    </Drawer>}
    </>}
    {view === 'schools' && <>
    <section><div className={styles.heading}><h2>School directory</h2><input type="search" aria-label="Search schools" placeholder="Search schools or email…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className={styles.scroll}><table><thead><tr><th>School</th><th>Contact</th><th>Registered computers</th><th>Complimentary places</th><th aria-label="Actions" /></tr></thead><tbody>
      {data.schools.filter(s => `${s.name} ${s.email} ${s.contact?.state}`.toLowerCase().includes(search.toLowerCase())).map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.contact?.state}</small></td><td>{s.email}<small>{s.contact?.school_phone}</small><small>{s.contact?.contact} · {s.contact?.contact_phone}</small></td><td>{data.devices.filter(d => d.school_id === s.id).length}</td><td>{data.devices.filter(d => d.school_id === s.id && d.free_place).length} / {s.free_limit}</td><td><button className={styles.quiet} type="button" onClick={() => { openView('computers'); setSchoolFilter(s.id) }}>View computers →</button></td></tr>)}
      {!busy && !data.schools.length && <tr><td colSpan={5}>No desktop school registrations yet.</td></tr>}
    </tbody></table></div></section>
    </>}
    {view === 'computers' && <>
    <section><div className={styles.heading}><h2>Computers & activation</h2><input aria-label="Find a school or computer" placeholder="Find school, email or computer…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className={styles.filters}><label>School<select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}><option value="">All schools</option>{data.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Show<select value={computerFilter} onChange={e => setComputerFilter(e.target.value)}><option value="all">All computers</option><option value="requests">Activation requests</option><option value="active">Activated</option><option value="pending">Free access</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="replaced">Replaced</option></select></label></div><div className={styles.scroll}><table><thead><tr><th>Computer</th><th>Request</th><th>Access</th><th>Expiry</th><th>Manage</th></tr></thead><tbody>
      {shown.map(d => <tr key={d.id}><td><strong>{d.computer_id}</strong><small>{schools.get(d.school_id)?.name}</small></td><td>{d.request_status || 'No request'}<small>{d.kind}{d.quantity > 1 ? ` · enquiry for ${d.quantity} computers` : ''}</small></td><td><span className={`${styles.badge} ${styles[accessState(d)] || ''}`}>{accessState(d) === 'pending' ? 'Free access' : accessState(d)}</span><small>{d.free_place ? 'Complimentary place allocated' : ''}</small></td><td>{d.starts_at ? date(d.expires_at) : 'Not activated'}</td><td><button disabled={busy} onClick={() => openComputer(d)}>Manage →</button></td></tr>)}
      {!busy && !shown.length && <tr><td colSpan={5}>No matching computers.</td></tr>}
    </tbody></table></div></section>
    {selected && <Drawer title={selected.computer_id} onClose={() => setDevice('')}><p>{schools.get(selected.school_id)?.name}</p>{message && <p role="alert" className={styles.message}>{message}</p>}<p>{selected.registration_details?.contact} · {selected.registration_details?.contact_phone}</p>{!data.canManage && <p>Only the owner can change computer activations. Team members can review registrations here.</p>}
      <form onSubmit={event => { event.preventDefault(); act('approve', { device_id: device, kind, months: Number(months), purchase_id: orderId, reason }) }}>
        <div className={styles.grid}>

          <label>Access type<select value={kind} onChange={e => setKind(e.target.value)}><option value="free">Complimentary</option><option value="paid">Paid</option></select></label>
          <label>Duration<select disabled={kind === 'paid'} value={months} onChange={e => setMonths(e.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="12">1 year</option><option value="0">Permanent — deliberate exception</option></select></label>
          <label>Confirmed payment for this school<select required={kind === 'paid'} disabled={kind !== 'paid'} value={orderId} onChange={e => setOrderId(e.target.value)}><option value="">Choose paid places</option>{grants.map(p => <option key={p.id} value={p.id}>{p.payment_reference} · {p.paid_quantity - Number(p.seats_used)} places left · {p.months === 0 ? 'Permanent' : `${p.months} months`}</option>)}</select></label>
        </div>
        <label>Note<textarea required minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you approving, renewing, rejecting or revoking?" /></label>
        <p>New access starts at approval. Paid approvals use the duration on the selected confirmed payment and consume one place. Renewal needs a new payment/place for that computer. Complimentary renewals use the chosen duration.</p>
        <div className={styles.actions}><button type="submit" disabled={!permitted || !selected}>Approve / renew</button><button type="button" disabled={!permitted || !selected} onClick={() => act('reject', { device_id: device, reason })}>Reject request</button><button type="button" disabled={!permitted || !selected} onClick={() => { if (window.confirm('Revoke this computer’s access? Saved results remain intact.')) act('revoke', { device_id: device, reason }) }}>Revoke</button></div>
      </form>
      <details className={styles.replacement}><summary>Replace a broken computer</summary><p>Select the new, unactivated computer above, then choose its old computer below. The remaining term and complimentary place transfer; this does not start a new trial. An offline old computer learns revocation when it reconnects.</p>
      <div className={styles.actions}><select aria-label="Old computer to retire" value={source} onChange={e => setSource(e.target.value)}><option value="">Choose old computer</option>{data.devices.filter(d => d.school_id === selected?.school_id && d.id !== device && d.state === 'active').map(d => <option key={d.id} value={d.id}>{d.computer_id}</option>)}</select><button disabled={!permitted || !selected || !source} onClick={() => { if (window.confirm('Retire the old computer and transfer its remaining access?')) act('replace', { device_id: device, source_device_id: source, reason }) }}>Transfer remaining access</button></div>
      </details>
    </Drawer>}
    </>}
  </div>
}
