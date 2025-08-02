"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { tasksApi } from "@/lib/api/tasks"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useEffect } from "react"

const groupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

type GroupFormValues = z.infer<typeof groupFormSchema>

interface TaskGroupFormProps {
  groupId?: number
  onSuccess: () => void
  onCancel?: () => void
  initialValues?: Partial<GroupFormValues>
}

export function TaskGroupForm({ groupId, onSuccess, onCancel, initialValues }: TaskGroupFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      ...initialValues
    },
  })

  useEffect(() => {
    if (initialValues) {
      form.reset({
        name: initialValues.name || "",
        description: initialValues.description || "",
      })
    }
  }, [initialValues, form])

  const createGroupMutation = useMutation({
    mutationFn: (data: GroupFormValues) => tasksApi.createTaskGroup({
      name: data.name,
      description: data.description || undefined,
      isBatch: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Task group created successfully")
      onSuccess()
    },
    onError: (error: Error) => {
      console.error("Failed to create task group:", error)
      toast.error(error.message || "Failed to create task group")
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GroupFormValues }) => 
      tasksApi.updateTaskGroup(id, {
        name: data.name,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Task group updated successfully")
      onSuccess()
    },
    onError: (error: Error) => {
      console.error("Failed to update task group:", error)
      toast.error(error.message || "Failed to update task group")
    },
  })

  const onSubmit = (data: GroupFormValues) => {
    if (groupId && groupId > 0) {
      updateGroupMutation.mutate({ id: groupId, data })
    } else {
      createGroupMutation.mutate(data)
    }
  }

  const isLoading = createGroupMutation.isPending || updateGroupMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
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
                  <Textarea
                    placeholder="Enter group description"
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? "Saving..."
              : (groupId && groupId > 0)
              ? "Update Group"
              : "Create Group"}
          </Button>
        </div>
      </form>
    </Form>
  )
}