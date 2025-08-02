"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { tasksApi, type Task } from "@/lib/api/tasks"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"
import { useMutation } from '@tanstack/react-query';

const formSchema = z.object({
  taskIds: z.array(z.number()).min(1, "Select at least one task"),
  groupId: z.number(),
})

export function AddTasksToGroupForm({
  groupId,
  onSuccess,
  onCancel,
}: {
  groupId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getTasks(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskIds: [],
      groupId: groupId,
    },
  })

  const addTasksMutation = useMutation({
    mutationFn: async ({ taskIds, groupId }: { taskIds: number[]; groupId: number }) => {
      const results = await Promise.allSettled(
        taskIds.map(taskId => tasksApi.addTaskToGroup(taskId, groupId))
      )
      
      const errors = results.filter(r => r.status === 'rejected')
      if (errors.length > 0) {
        throw new Error(`Failed to add ${errors.length} tasks`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Tasks added to group successfully!")
      onSuccess()
    },
    onError: (error: Error) => {
      console.error("Failed to add tasks to group:", error)
      toast.error(error.message || "Failed to add tasks to group")
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    addTasksMutation.mutate(values)
  }

  const availableTasks = tasks.filter(
    (task) => !task.groupId || task.groupId !== groupId
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="taskIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Select Tasks</FormLabel>
                <FormDescription>
                  Choose which tasks to add to this group
                </FormDescription>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : availableTasks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No available tasks to add</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableTasks.map((task) => (
                    <FormField
                      key={task.id}
                      control={form.control}
                      name="taskIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={task.id}
                            className="flex flex-row items-start space-x-3 space-y-0 p-2 hover:bg-gray-50 rounded-md"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, task.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== task.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{task.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {task.status}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <input type="hidden" {...form.register("groupId")} />

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            disabled={addTasksMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={addTasksMutation.isPending || form.getValues("taskIds").length !== 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {addTasksMutation.isPending ? "Adding..." : "Add Tasks"}
          </Button>
        </div>
      </form>
    </Form>
  )
}