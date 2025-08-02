"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }

      // Chiamata alla tua API Node.js per verificare il token
      const response = await api.get("/token/")
      setUser(response.data)
    } catch (error) {
      console.error("Auth check failed:", error)
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      // Chiamata alla tua API Node.js per il login
      const response = await api.post("/token/", { email, password })
      const { token, role } = response.data

      localStorage.setItem("token", token)
      await checkAuth()
      router.push("/dashboard")
      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Errore durante il login"
      return { success: false, error: errorMessage }
    }
  }

  const register = async (userData) => {
    try {
      // Chiamata alla tua API Node.js per la registrazione
      const response = await api.post("/user/registration", userData)
      console.log(response.message)
      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Errore durante la registrazione"
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      // Opzionale: chiamata alla tua API per invalidare il token
      console.log("logout avvenuto con successo!")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("token")
      setUser(null)
      router.push("/login")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}