'use client'
// src/app/admin/activity/page.js
// Activity Log: a record of every subscription activated or cancelled, slots
// added to schools, students added to or removed from schools, student edits
// and deletions, and admin team changes — when, and by whom. Every admin can
// read it; nobody can edit it.

import ActivityFeed from '@/components/admin/activity/ActivityFeed'
import s from '@/components/admin/activity/activity.module.css'

export default function AdminActivityPage() {
  return <div className={s.page}>
    <h1 className={s.title}>Activity Log</h1>
    <p className={s.sub}>Who did what, and when. Times are Nigerian time.</p>
    <ActivityFeed/>
  </div>
}
