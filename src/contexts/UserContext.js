'use client'
// src/contexts/UserContext.js
// ─────────────────────────────────────────────────────────────────────────────
// Shares the authenticated user ID from the server layout down to all client
// pages — so they don't each call supabase.auth.getUser() independently.
//
// Each page calling getUser() costs ~200-400ms before any data loads.
// This context eliminates that overhead for every student page.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext } from 'react'

const UserContext = createContext({ userId: null, profile: null })

export function UserProvider({ userId, profile, children }) {
  return (
    <UserContext.Provider value={{ userId, profile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}