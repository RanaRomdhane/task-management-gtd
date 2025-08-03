"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Clock, ExternalLink } from "lucide-react"
import { calendarApi } from "@/lib/api/calendar"
import { format, startOfMonth, endOfMonth, isSameDay, isToday, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { parseISO } from "date-fns/fp";
import { eachDayOfInterval } from "date-fns/fp";
import { cn } from "@/lib/utils"
import Link from "next/link"

interface MiniCalendarWidgetProps {
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

export function MiniCalendarWidget({ 
  className, 
  showHeader = true,
  maxHeight = "400px" 
}: MiniCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Get events for the current month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events-mini", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
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
    const grouped: Record<string, number> = {}
    events.forEach(event => {
      const dateKey = format(parseISO(event.startTime), "yyyy-MM-dd")
      grouped[dateKey] = (grouped[dateKey] || 0) + 1
    })
    return grouped
  }, [events])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const getEventCountForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd")
    return eventsByDate[dateKey] || 0
  }

  const todaysEvents = useMemo(() => {
    const today = new Date()
    return events.filter(event => 
      isSameDay(parseISO(event.startTime), today)
    ).slice(0, 3)
  }, [events])

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-full"></div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </CardTitle>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4" style={{ maxHeight, overflowY: 'auto' }}>
        {/* Mini Calendar Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">
            {format(currentDate, "MMM yyyy")}
          </h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-6 px-2 text-xs"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Mini Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const eventCount = getEventCountForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <button
                key={day.toString()}
                className={cn(
                  "relative h-8 text-xs flex items-center justify-center rounded hover:bg-muted/50 transition-colors",
                  !isCurrentMonth && "opacity-40",
                  isSelected && "bg-primary text-primary-foreground",
                  isCurrentDay && !isSelected && "bg-primary/10 text-primary font-medium",
                  eventCount > 0 && !isSelected && !isCurrentDay && "bg-blue-50 dark:bg-blue-950"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <span>{format(day, "d")}</span>
                {eventCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">
                      {eventCount > 9 ? '9+' : eventCount}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Today's Events */}
        {todaysEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>Today's Events</span>
            </h4>
            <div className="space-y-1">
              {todaysEvents.map(event => (
                <div key={event.id} className="p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{event.title}</span>
                    {event.task && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Task
                      </Badge>
                    )}
                  </div>
                  {!event.isAllDay && (
                    <div className="text-muted-foreground mt-1">
                      {format(parseISO(event.startTime), "h:mm a")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Date Events */}
        {selectedDate && !isToday(selectedDate) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {format(selectedDate, "MMM d")} Events
            </h4>
            {events
              .filter(event => isSameDay(parseISO(event.startTime), selectedDate))
              .slice(0, 3)
              .map(event => (
                <div key={event.id} className="p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{event.title}</span>
                    {event.task && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Task
                      </Badge>
                    )}
                  </div>
                  {!event.isAllDay && (
                    <div className="text-muted-foreground mt-1">
                      {format(parseISO(event.startTime), "h:mm a")}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}