"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Plus } from "lucide-react"
import { calendarApi, CalendarEvent } from "@/lib/api/calendar"
import { format, startOfMonth, endOfMonth, isSameDay, isToday, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek} from "date-fns"
import { parseISO } from "date-fns/fp";
import { eachDayOfInterval } from "date-fns/fp";
import { cn } from "@/lib/utils"
import { CreateEventDialog } from "./create-event-dialog"

interface CalendarViewProps {
  className?: string
}

export function CalendarView({ className }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  // Get events for the current month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: () => calendarApi.getEvents({
        startDate: monthStart,
        endDate: monthEnd
      }),
  })

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart)
    const end = endOfWeek(monthEnd)
    return eachDayOfInterval({ start, end })
  }, [monthStart, monthEnd])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    events.forEach(event => {
      const dateKey = format(parseISO(event.startTime), "yyyy-MM-dd")
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    return grouped
  }, [events])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const getEventsForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd")
    return eventsByDate[dateKey] || []
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleCreateEvent = () => {
    setShowCreateDialog(true)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-full"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Calendar</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleCreateEvent}>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(day => {
              const dayEvents = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    !isCurrentMonth && "opacity-50",
                    isSelected && "ring-2 ring-primary",
                    isCurrentDay && "bg-primary/10 border-primary"
                  )}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isCurrentDay && "text-primary font-bold"
                  )}>
                    {format(day, "d")}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded truncate",
                          event.task 
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        )}
                        title={event.title}
                      >
                        {event.isAllDay ? (
                          <span>{event.title}</span>
                        ) : (
                          <span>
                            {format(parseISO(event.startTime), "HH:mm")} {event.title}
                          </span>
                        )}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Date Events */}
          {selectedDate && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Events for {format(selectedDate, "MMMM d, yyyy")}</span>
              </h3>
              
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="p-3 bg-background rounded border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{event.title}</h4>
                            {event.task && (
                              <Badge variant="outline" className="text-xs">
                                Task Linked
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            {!event.isAllDay && (
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {format(parseISO(event.startTime), "h:mm a")} - {format(parseISO(event.endTime), "h:mm a")}
                                </span>
                              </div>
                            )}
                            
                            {event.location && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-3 w-3" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            
                            {event.description && (
                              <p className="text-xs mt-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No events for this date</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  )
}