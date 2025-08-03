"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Plus } from "lucide-react"
import { calendarApi } from "@/lib/api/calendar"
import { Task } from "@/lib/api/tasks"
import { toast } from "sonner"
import { format } from "date-fns"

interface TaskCalendarIntegrationProps {
  task: Task
  hasCalendarEvent?: boolean
}

export function TaskCalendarIntegration({ task, hasCalendarEvent }: TaskCalendarIntegrationProps) {
  const queryClient = useQueryClient()

  const createEventMutation = useMutation({
    mutationFn: () => calendarApi.createEventFromTask(task.id),
    onSuccess: () => {
      toast.success("Calendar event created from task")
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create calendar event")
    },
  })

  if (hasCalendarEvent) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Calendar Event Linked</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Synced
              </Badge>
            </div>
            {task.dueDate && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(task.dueDate), "MMM d, h:mm a")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Calendar Integration</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Create a calendar event for this task to block time and set reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={() => createEventMutation.mutate()}
          disabled={createEventMutation.isPending || task.status === "done"}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Plus className="h-3 w-3 mr-2" />
          {createEventMutation.isPending ? "Creating Event..." : "Add to Calendar"}
        </Button>
        
        {task.status === "done" && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Cannot create calendar events for completed tasks
          </p>
        )}
        
        {task.dueDate && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Suggested time:</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">
                  {format(new Date(task.dueDate), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}