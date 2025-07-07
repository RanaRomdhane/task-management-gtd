"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api/auth"

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  loading: boolean
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      // Decode token to get user info (simplified)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setUser({
          id: payload.sub,
          email: payload.email,
          firstName: payload.firstName || "",
          lastName: payload.lastName || "",
        })
      } catch (error) {
        localStorage.removeItem("token")
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      localStorage.setItem("token", response.access_token)

      // Decode token to get user info
      const payload = JSON.parse(atob(response.access_token.split(".")[1]))
      setUser({
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName || "",
        lastName: payload.lastName || "",
      })

      router.push("/dashboard")
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data)
      localStorage.setItem("token", response.access_token)

      // Decode token to get user info
      const payload = JSON.parse(atob(response.access_token.split(".")[1]))
      setUser({
        id: payload.sub,
        email: payload.email,
        firstName: data.firstName,
        lastName: data.lastName,
      })

      router.push("/dashboard")
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    router.push("/")
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
