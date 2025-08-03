// app/calendar/success/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { calendarApi } from "@/lib/api/calendar"
import { toast } from "sonner"

export default function CalendarSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    const handleAuth = async () => {
      if (error) {
        toast.error("Authorization failed: " + error)
        router.push('/dashboard/calendar')
        return
      }

      if (!code) {
        toast.error("No authorization code received")
        router.push('/dashboard/calendar')
        return
      }

      try {
        const result = await calendarApi.handleCallback(code)
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ["calendar-status"] })
      } catch (err) {
        toast.error("Failed to complete authorization")
      } finally {
        router.push('/dashboard/calendar')
      }
    }

    handleAuth()
  }, [router, searchParams, queryClient])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing Google Calendar Connection</h1>
        <p>Please wait while we finalize your connection...</p>
      </div>
    </div>
  )
}