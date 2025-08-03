"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, CheckCircle, ExternalLink, RefreshCw, Unlink, AlertCircle } from "lucide-react"
import { calendarApi } from "@/lib/api/calendar"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function CalendarConnection() {
  const [isConnecting, setIsConnecting] = useState(false)
  const queryClient = useQueryClient()

  const { data: connectionStatus, isLoading } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: calendarApi.getConnectionStatus,
  })

  const syncMutation = useMutation({
    mutationFn: calendarApi.syncEvents,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to sync events")
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: calendarApi.disconnect,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to disconnect calendar")
    },
  })

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (code) {
      // Handle successful OAuth callback
      handleOAuthCode(code)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error) {
      toast.error("Failed to connect Google Calendar")
      setIsConnecting(false)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleOAuthCode = async (code: string) => {
    try {
      const response = await calendarApi.handleCallback(code)
      toast.success(response.message)
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] })
      setIsConnecting(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to connect Google Calendar")
      setIsConnecting(false)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      const { authUrl } = await calendarApi.getAuthUrl()
      
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting calendar:", error)
      toast.error("Failed to initiate calendar connection")
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Google Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Google Calendar Integration</span>
          {connectionStatus?.connected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sync your tasks with Google Calendar for better time management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus?.connected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Google Calendar is connected. You can now sync events and create calendar entries from tasks.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? "Syncing..." : "Sync Events"}
              </Button>
              
              <Button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Calendar to sync tasks and events automatically.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Google Calendar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}