"use client"

import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calendarApi, CreateEventRequest } from "@/lib/api/calendar"
import { tasksApi } from "@/lib/api/tasks"
import { toast } from "sonner"

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEventDialog({ open, onOpenChange }: CreateEventDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    isAllDay: false,
    taskId: undefined as number | undefined,
  })

  const queryClient = useQueryClient()

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getTasks,
  })

  const createEventMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Validate required fields
      if (!data.title || !data.startTime || !data.endTime) {
        throw new Error("Please fill in all required fields")
      }

      // Create proper ISO date strings
      const formatDateForApi = (dateInput: string, isAllDay: boolean): string => {
        if (!dateInput) throw new Error("Date is required")
        
        if (isAllDay) {
          // For all-day events, use just the date part
          const date = new Date(dateInput)
          return date.toISOString().split('T')[0] + 'T00:00:00.000Z'
        } else {
          // For timed events, ensure we have a proper datetime
          const date = new Date(dateInput)
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format")
          }
          return date.toISOString()
        }
      }

      const payload: CreateEventRequest = {
        title: data.title,
        description: data.description || undefined,
        startTime: formatDateForApi(data.startTime, data.isAllDay),
        endTime: formatDateForApi(data.endTime, data.isAllDay),
        location: data.location || undefined,
        isAllDay: data.isAllDay,
        taskId: data.taskId,
      }

      console.log('Sending payload:', payload)
      return calendarApi.createEvent(payload)
    },
    onSuccess: () => {
      toast.success("Event created successfully")
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
      onOpenChange(false)
      // Reset form
      setFormData({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        location: "",
        isAllDay: false,
        taskId: undefined,
      })
    },
    onError: (error: Error) => {
      console.error('Create event error:', error)
      toast.error(error.message || "Failed to create event")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createEventMutation.mutate(formData)
  }

  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Auto-set end time when start time changes (for convenience)
  const handleStartTimeChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, startTime: value }
      
      // If no end time is set, auto-set it to 1 hour after start time
      if (!prev.endTime && value) {
        try {
          const startDate = new Date(value)
          const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // Add 1 hour
          
          if (prev.isAllDay) {
            newData.endTime = value // Same day for all-day events
          } else {
            // Format for datetime-local input
            const offset = endDate.getTimezoneOffset()
            const adjustedDate = new Date(endDate.getTime() - (offset * 60 * 1000))
            newData.endTime = adjustedDate.toISOString().slice(0, 16)
          }
        } catch (error) {
          // If date parsing fails, just set the start time
        }
      }
      
      return newData
    })
  }

  const availableTasks = tasks.filter(task => task.status !== "done")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAllDay"
              checked={formData.isAllDay}
              onCheckedChange={(checked) => {
                const isAllDay = !!checked
                setFormData(prev => {
                  const newData = { ...prev, isAllDay }
                  
                  // When switching to all-day, convert existing times to dates
                  if (isAllDay && prev.startTime) {
                    const startDate = new Date(prev.startTime)
                    newData.startTime = startDate.toISOString().split('T')[0]
                    if (prev.endTime) {
                      const endDate = new Date(prev.endTime)
                      newData.endTime = endDate.toISOString().split('T')[0]
                    }
                  }
                  
                  return newData
                })
              }}
            />
            <Label htmlFor="isAllDay">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Event location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskId">Link to Task (Optional)</Label>
            <Select
              value={formData.taskId?.toString() || "none"}
              onValueChange={(value) => handleInputChange("taskId", value === "none" ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No task</SelectItem>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}