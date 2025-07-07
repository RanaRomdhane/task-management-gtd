"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react"
import { tasksApi, type TaskGroup, TaskStatus } from "@/lib/api/tasks"
import { TaskGroupForm } from "@/components/forms/task-group-form"
import { toast } from "sonner"

export function TaskGroupsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showCreateSample, setShowCreateSample] = useState(false)

  const queryClient = useQueryClient()

  const {
    data: taskGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["task-groups"],
    queryFn: tasksApi.getTaskGroups,
    retry: 1, // Reduce retries to fail faster
    retryDelay: 500,
    staleTime: 30000, // 30 seconds
  })

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getTasks,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  })

  // Create sample group mutation
  const createSampleGroupMutation = useMutation({
    mutationFn: async () => {
      const sampleGroup = {
        name: "Sample Project Group",
        description: "A sample group to demonstrate the functionality",
        isBatch: false,
      }
      return tasksApi.createTaskGroup(sampleGroup)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Sample group created successfully!")
      setShowCreateSample(false)
    },
    onError: (error) => {
      console.error("Failed to create sample group:", error)
      toast.error("Failed to create sample group")
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      // First remove all tasks from the group
      const groupTasks = tasks.filter((task) => task.groupId === groupId)
      for (const task of groupTasks) {
        await tasksApi.removeTaskFromGroup(task.id)
      }
      // Delete the group
      await tasksApi.deleteTaskGroup(groupId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Task group deleted successfully")
    },
    onError: (error) => {
      console.error("Delete group error:", error)
      toast.error("Failed to delete task group")
    },
  })

  // Debug logging
  useEffect(() => {
    console.log("=== TASK GROUPS DEBUG ===")
    console.log("Task Groups:", taskGroups)
    console.log("Task Groups Length:", taskGroups?.length || 0)
    console.log("Task Groups Loading:", groupsLoading)
    console.log("Task Groups Error:", groupsError)
    console.log("Tasks:", tasks)
    console.log("Tasks Length:", tasks?.length || 0)
    console.log("Tasks Loading:", tasksLoading)
    console.log("Tasks Error:", tasksError)
    console.log("========================")

    // Show create sample option if no groups and no error
    if (!groupsLoading && !groupsError && taskGroups.length === 0) {
      setShowCreateSample(true)
    }
  }, [taskGroups, tasks, groupsLoading, tasksLoading, groupsError, tasksError])

  const isLoading = groupsLoading || tasksLoading

  const filteredGroups = (taskGroups || []).filter(
    (group) =>
      group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group?.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteGroup = (groupId: number) => {
    if (confirm("Are you sure you want to delete this group? All tasks will be ungrouped.")) {
      deleteGroupMutation.mutate(groupId)
    }
  }

  const handleEditGroup = (group: TaskGroup) => {
    setSelectedGroup(group)
    setIsEditDialogOpen(true)
  }

  const getGroupStats = (group: TaskGroup) => {
    // Get tasks that belong to this group
    const groupTasks = tasks.filter((task) => task.groupId === group.id)
    const completedTasks = groupTasks.filter((task) => task.status === TaskStatus.DONE)

    return {
      total: groupTasks.length,
      completed: completedTasks.length,
      completionRate: groupTasks.length > 0 ? (completedTasks.length / groupTasks.length) * 100 : 0,
    }
  }

  const handleRefresh = () => {
    refetchGroups()
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    toast.success("Data refreshed")
  }

  const handleCreateSampleGroup = () => {
    createSampleGroupMutation.mutate()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Groups</h1>
            <p className="text-muted-foreground">Organize your tasks into groups for better management</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleRefresh} className="bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task Group</DialogTitle>
                </DialogHeader>
                <TaskGroupForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const stats = getGroupStats(group)
              return (
                <Card key={group.id} className="task-card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                          {group.isBatch && (
                            <Badge variant="secondary" className="text-xs">
                              AI Batch
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2 mt-1">
                          {group.description || "No description"}
                        </CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {group.id} | User: {group.userId}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteGroup(group.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {stats.total} task{stats.total !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">{stats.completed} completed</span>
                      </div>
                    </div>

                    {stats.total > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{stats.completionRate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Show tasks in this group */}
                    {stats.total > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Tasks:</p>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {tasks
                            .filter((task) => task.groupId === group.id)
                            .slice(0, 3)
                            .map((task) => (
                              <div key={task.id} className="text-xs text-muted-foreground truncate">
                                • {task.title}
                              </div>
                            ))}
                          {tasks.filter((task) => task.groupId === group.id).length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{tasks.filter((task) => task.groupId === group.id).length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        View Tasks ({stats.total})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : !isLoading && !groupsError && taskGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No task groups yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first task group to organize your tasks better.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
                {showCreateSample && (
                  <Button
                    variant="outline"
                    onClick={handleCreateSampleGroup}
                    disabled={createSampleGroupMutation.isPending}
                    className="bg-transparent"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {createSampleGroupMutation.isPending ? "Creating..." : "Create Sample Group"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matching groups</h3>
              <p className="text-muted-foreground text-center mb-4">
                Try adjusting your search terms or create a new group.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Group Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task Group</DialogTitle>
            </DialogHeader>
            {selectedGroup && (
              <TaskGroupForm
                group={selectedGroup}
                onSuccess={() => {
                  setIsEditDialogOpen(false)
                  setSelectedGroup(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
