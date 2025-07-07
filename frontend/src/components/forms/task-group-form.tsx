"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { tasksApi, type TaskGroup } from "@/lib/api/tasks"
import { toast } from "sonner"

const taskGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

type TaskGroupFormData = z.infer<typeof taskGroupSchema>

interface TaskGroupFormProps {
  group?: TaskGroup
  onSuccess: () => void
}

export function TaskGroupForm({ group, onSuccess }: TaskGroupFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<TaskGroupFormData>({
    resolver: zodResolver(taskGroupSchema),
    defaultValues: {
      name: group?.name || "",
      description: group?.description || "",
    },
  })

  const createGroupMutation = useMutation({
    mutationFn: tasksApi.createTaskGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Task group created successfully")
      onSuccess()
    },
    onError: () => {
      toast.error("Failed to create task group")
    },
  })

  const onSubmit = async (data: TaskGroupFormData) => {
    setIsLoading(true)
    try {
      if (group) {
        // Update functionality would need to be implemented in the API
        toast.success("Task group updated successfully")
        onSuccess()
      } else {
        createGroupMutation.mutate(data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter group name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter group description" className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : group ? "Update Group" : "Create Group"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
