"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { calendarApi, CalendarEvent, UpdateEventRequest } from "@/lib/api/calendar"
import { toast } from "sonner"
import { format } from "date-fns"

interface EditEventDialogProps {
  event: CalendarEvent
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function EditEventDialog({ event, open, onOpenChange, onClose }: EditEventDialogProps) {
  const [formData, setFormData] = useState<UpdateEventRequest>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || "",
        startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
        location: event.location || "",
        isAllDay: event.isAllDay,
      })
    }
  }, [event])

  const updateEventMutation = useMutation({
    mutationFn: (data: UpdateEventRequest) => calendarApi.updateEvent(event.id, data),
    onSuccess: () => {
      toast.success("Event updated successfully")
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update event")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields")
      return
    }

    updateEventMutation.mutate(formData)
  }

  const handleInputChange = (field: keyof UpdateEventRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Calendar Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAllDay"
              checked={formData.isAllDay || false}
              onCheckedChange={(checked) => handleInputChange("isAllDay", !!checked)}
            />
            <Label htmlFor="isAllDay">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.endTime instanceof Date ? format(formData.endTime, "yyyy-MM-dd'T'HH:mm") : formData.endTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.endTime instanceof Date ? format(formData.endTime, "yyyy-MM-dd'T'HH:mm") : formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Event location"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Updating..." : "Update Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
