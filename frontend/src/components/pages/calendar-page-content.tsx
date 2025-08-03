"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Settings, List, Grid, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { calendarApi } from "@/lib/api/calendar"
import { CalendarView } from "@/components/calendar/calendar-view"
import { CalendarEvents } from "@/components/calendar/calendar-events"
import { CalendarConnection } from "@/components/calendar/calendar-connection"
import { startOfMonth, endOfMonth } from "date-fns"
import { toast } from "sonner"

export function CalendarPageContent() {
  const [activeTab, setActiveTab] = useState("calendar")
  const currentDate = new Date()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const { 
    data: connectionStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus 
  } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: calendarApi.getConnectionStatus,
    retry: 3,
    retryDelay: 1000,
  })

  const { 
    data: events = [], 
    error,
    isLoading: eventsLoading,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ["calendar-events", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () => calendarApi.getEvents({
      startDate: monthStart,
      endDate: monthEnd
    }),
    enabled: connectionStatus?.connected === true,
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 403 (not connected) or 401 (auth error)
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: 1000,
  })

  const handleRetry = () => {
    refetchStatus();
    if (connectionStatus?.connected) {
      refetchEvents();
    }
  }

  // Show error state with retry option
  if (error && !eventsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">
              Manage your calendar events and sync with Google Calendar
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Failed to load calendar events: {(error as Error).message}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        {/* Show connection settings even on error */}
        <CalendarConnection />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your calendar events and sync with Google Calendar
          </p>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!statusLoading && (
        <Alert className={connectionStatus?.connected ? "border-green-200 dark:border-green-800" : ""}>
          {connectionStatus?.connected ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Google Calendar is connected. Your events are synced automatically.
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Calendar to sync events and get the most out of calendar integration.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Grid className="h-4 w-4" />
            <span>Calendar View</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Event List</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView />
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <CalendarEvents />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CalendarConnection />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Calendar Statistics</span>
                </CardTitle>
                <CardDescription>
                  Overview of your calendar usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{events.length}</div>
                    <div className="text-sm text-muted-foreground">Total Events</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {events.filter(e => e.task).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Linked to Tasks</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Task Integration</span>
                    <span className="font-medium">
                      {events.length > 0 
                        ? `${Math.round((events.filter(e => e.task).length / events.length) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: events.length > 0 
                          ? `${(events.filter(e => e.task).length / events.length) * 100}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}