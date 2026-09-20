import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Restore the session on a hard refresh
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const account = await api.login(credentials)
    setUser(account)
    return account
  }, [])

  const register = useCallback(async (details) => {
    const account = await api.register(details)
    setUser(account)
    return account
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } finally { setUser(null) }
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
