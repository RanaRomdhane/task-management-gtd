"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Trash2, Edit, Plus } from "lucide-react"
import { calendarApi, CalendarEvent } from "@/lib/api/calendar"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { toast } from "sonner"
import { CreateEventDialog } from "./create-event-dialog"
import { EditEventDialog } from "./edit-event-dialog"

export function CalendarEvents() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const queryClient = useQueryClient()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => calendarApi.getEvents(),
  })

  const deleteEventMutation = useMutation({
    mutationFn: calendarApi.deleteEvent,
    onSuccess: () => {
      toast.success("Event deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete event")
    },
  })

  const formatEventDate = (date: string) => {
    const eventDate = new Date(date)
    
    if (isToday(eventDate)) {
      return `Today at ${format(eventDate, "h:mm a")}`
    } else if (isTomorrow(eventDate)) {
      return `Tomorrow at ${format(eventDate, "h:mm a")}`
    } else if (isYesterday(eventDate)) {
      return `Yesterday at ${format(eventDate, "h:mm a")}`
    } else {
      return format(eventDate, "MMM d, yyyy 'at' h:mm a")
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEditDialog(true)
  }

  const handleDeleteEvent = (eventId: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(eventId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border rounded-lg space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendar Events</span>
              </CardTitle>
              <CardDescription>
                Your upcoming calendar events and appointments
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calendar events found</p>
              <p className="text-sm">Create an event or sync with Google Calendar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium truncate">{event.title}</h3>
                        {event.task && (
                          <Badge variant="outline" className="text-xs">
                            Task Linked
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventDate(event.startTime)}</span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        {event.description && (
                          <p className="text-xs line-clamp-2 mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deleteEventMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {selectedEvent && (
        <EditEventDialog
          event={selectedEvent}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onClose={() => {
            setSelectedEvent(null)
            setShowEditDialog(false)
          }}
        />
      )}
    </>
  )
}