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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TaskGroupForm } from "@/components/forms/task-group-form"
import { useRouter } from "next/navigation"
import { DialogDescription } from "@/components/ui/dialog"
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
  Eye,
  Clock,
  Calendar,
  ArrowRight,
  ChevronRight,
  Target,
  Zap,
  X,
} from "lucide-react"
import { tasksApi, type TaskGroup, type Task, TaskStatus, TaskPriority, TaskType } from "@/lib/api/tasks"
import { toast } from "sonner"
import { AddTasksToGroupForm } from "@/components/forms/add-tasks-to-group-form";

export function TaskGroupsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewTasksOpen, setIsViewTasksOpen] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<TaskGroup | null>(null)
  const [showCreateSample, setShowCreateSample] = useState(false)
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false)
  const [selectedTaskGroupId, setSelectedTaskGroupId] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const {
    data: taskGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["task-groups"],
    queryFn: async () => {
      try {
        const result = await tasksApi.getTaskGroups()
        return result.map(group => ({
          ...group,
          tasks: group.tasks || []
        }))
      } catch (error) {
        console.error('Failed to fetch task groups:', error)
        throw error
      }
    },
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  })

  const createTaskGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return tasksApi.createTaskGroup(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Task group created successfully!")
      setIsCreateDialogOpen(false)
    },
    onError: (error) => {
      console.error("Failed to create task group:", error)
      toast.error("Failed to create task group")
    },
  })

  const getGroupStats = (group: TaskGroup) => {
    const groupTasks = Array.isArray(group.tasks) ? group.tasks : []
    const completedTasks = groupTasks.filter((task) => task.status === TaskStatus.DONE)
    const inProgressTasks = groupTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS)
    const highPriorityTasks = groupTasks.filter((task) => task.priority === TaskPriority.HIGH || task.priority === TaskPriority.CRITICAL)

    return {
      total: groupTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      highPriority: highPriorityTasks.length,
      completionRate: groupTasks.length > 0 ? (completedTasks.length / groupTasks.length) * 100 : 0,
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL: return "bg-red-500 text-white"
      case TaskPriority.HIGH: return "bg-orange-500 text-white"
      case TaskPriority.MEDIUM: return "bg-yellow-500 text-white"
      case TaskPriority.LOW: return "bg-green-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return "bg-green-100 text-green-800 border-green-200"
      case TaskStatus.IN_PROGRESS: return "bg-blue-100 text-blue-800 border-blue-200"
      case TaskStatus.BLOCKED: return "bg-red-100 text-red-800 border-red-200"
      case TaskStatus.TODO: return "bg-gray-100 text-gray-800 border-gray-200"
      case TaskStatus.ARCHIVED: return "bg-purple-100 text-purple-800 border-purple-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.MEETING: return "📅"
      case TaskType.WORK: return "💼"
      case TaskType.PERSONAL: return "🏠"
      case TaskType.LEARNING: return "📚"
      case TaskType.CREATIVE: return "🎨"
      case TaskType.COMMUNICATION: return "💬"
      case TaskType.ADMIN: return "⚙️"
      default: return "📋"
    }
  }

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
      if (!groupId || isNaN(groupId) || groupId <= 0) {
        throw new Error(`Invalid group ID: ${groupId}`)
      }

      const group = taskGroups.find(g => g.id === groupId)
      
      if (group?.tasks && group.tasks.length > 0) {
        for (const task of group.tasks) {
          if (task.id && !isNaN(task.id) && task.id > 0) {
            await tasksApi.removeTaskFromGroup(task.id)
          }
        }
      }
      
      await tasksApi.deleteTaskGroup(groupId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success("Task group deleted successfully")
      if (viewingGroup && deleteGroupMutation.variables === viewingGroup.id) {
        setIsViewTasksOpen(false)
        setViewingGroup(null)
      }
    },
    onError: (error: Error) => {
      console.error("Delete group error:", error)
      toast.error(`Failed to delete task group: ${error.message}`)
    },
  })

  useEffect(() => {
    if (!groupsLoading && !groupsError && (!taskGroups || taskGroups.length === 0)) {
      setShowCreateSample(true)
    }
  }, [taskGroups, groupsLoading, groupsError])

  const isLoading = groupsLoading

  const filteredGroups = (taskGroups || []).filter(
    (group) =>
      group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group?.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteGroup = (groupId: number) => {
    if (!groupId || isNaN(groupId) || groupId <= 0) {
      toast.error('Invalid group ID')
      return
    }

    if (confirm("Are you sure you want to delete this group? All tasks will be ungrouped.")) {
      deleteGroupMutation.mutate(groupId)
    }
  }

  const handleEditGroup = (group: TaskGroup) => {
    setSelectedGroup(group)
    setIsEditDialogOpen(true)
  }

  const handleViewTasks = (group: TaskGroup) => {
    setViewingGroup(group)
    setIsViewTasksOpen(true)
  }

  const handleRefresh = () => {
    refetchGroups()
    toast.success("Data refreshed")
  }

  const handleCreateSampleGroup = () => {
    createSampleGroupMutation.mutate()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleAddTasksToGroup = (groupId: number) => {
    if (!groupId || isNaN(groupId) || groupId <= 0) {
      toast.error('Invalid group ID')
      return
    }
    setSelectedTaskGroupId(groupId)
    setIsAddTaskDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Combined Header and Search */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Task Groups</h1>
                <p className="text-muted-foreground text-sm">Organize tasks for better workflow</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh} 
                    size="sm"
                    className="shrink-0"
                  >
                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="shrink-0">
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">New Group</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Task Group</DialogTitle>
                      </DialogHeader>
                      <TaskGroupForm
                        onSuccess={() => setIsCreateDialogOpen(false)}
                        onCancel={() => setIsCreateDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse h-48">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
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
        ) : groupsError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold mb-1 text-red-700">Error Loading Groups</h3>
              <p className="text-red-600 text-center mb-3">
                {groupsError instanceof Error ? groupsError.message : 'Failed to load task groups'}
              </p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredGroups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const stats = getGroupStats(group)
              return (
                <Card 
                  key={group.id} 
                  className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 flex flex-col h-full"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                          {group.isBatch && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <Zap className="h-3 w-3 mr-1" />
                              AI Batch
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2 text-sm">
                          {group.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTasks(group)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Tasks
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddTasksToGroup(group.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tasks
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteGroup(group.id)} 
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{stats.total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{stats.completed}</p>
                          <p className="text-xs text-muted-foreground">Done</p>
                        </div>
                      </div>
                    </div>

                    {stats.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{stats.completionRate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {stats.total > 0 ? (
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">Recent Tasks</p>
                          {stats.highPriority > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Target className="h-3 w-3 mr-1" />
                              {stats.highPriority} high
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          {group.tasks?.slice(0, 2).map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center gap-2 p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-sm">{getTypeIcon(task.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-black truncate">{task.title}</p>
                              </div>
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 flex-1 flex flex-col justify-center">
                        <FolderOpen className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">No tasks</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 hover:bg-blue-50 hover:border-blue-300" 
                        onClick={() => handleViewTasks(group)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 hover:bg-green-50 hover:border-green-300" 
                        onClick={() => handleAddTasksToGroup(group.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
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
              <div className="p-3 rounded-full bg-blue-50 mb-3">
                <FolderOpen className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-1">No task groups yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md text-sm">
                Create your first task group to organize your tasks better.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Group
                </Button>
                {showCreateSample && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateSampleGroup}
                    disabled={createSampleGroupMutation.isPending}
                    className="bg-transparent"
                  >
                    <Database className="h-4 w-4 mr-1" />
                    {createSampleGroupMutation.isPending ? "Creating..." : "Sample"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-semibold mb-1">No matching groups</h3>
              <p className="text-muted-foreground text-center mb-3 text-sm">
                Try adjusting your search terms.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Group
              </Button>
            </CardContent>
          </Card>
        )}

{/* View Tasks Sheet */}
<Sheet open={isViewTasksOpen} onOpenChange={setIsViewTasksOpen}>
  <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full">
    {viewingGroup && (
      <>
        <SheetHeader className="border-b p-6 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-6 w-6 text-blue-500" />
                <SheetTitle className="text-xl">{viewingGroup.name}</SheetTitle>
                {viewingGroup.isBatch && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                    <Zap className="h-3 w-3 mr-1" />
                    AI Batch
                  </Badge>
                )}
              </div>
              <SheetDescription className="text-sm">
                {viewingGroup.description || "No description provided"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsViewTasksOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 space-y-6 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: getGroupStats(viewingGroup).total, icon: Users, color: "blue" },
                { label: "Completed", value: getGroupStats(viewingGroup).completed, icon: CheckCircle2, color: "green" },
                { label: "In Progress", value: getGroupStats(viewingGroup).inProgress, icon: Clock, color: "orange" },
                { label: "High Priority", value: getGroupStats(viewingGroup).highPriority, icon: Target, color: "red" },
              ].map((stat) => (
                <Card key={stat.label} className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-${stat.color}-50 dark:bg-${stat.color}-900`}>
                      <stat.icon className={`h-4 w-4 text-${stat.color}-600 dark:text-${stat.color}-300`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {getGroupStats(viewingGroup).total > 0 && (
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-bold">{getGroupStats(viewingGroup).completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                      style={{ width: `${getGroupStats(viewingGroup).completionRate}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="px-6 pb-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold">Tasks</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getGroupStats(viewingGroup).total} total
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleAddTasksToGroup(viewingGroup.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tasks
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded-lg border">
              <ScrollArea className="h-full">
                <div className="divide-y">
                  {viewingGroup.tasks?.length > 0 ? (
                    viewingGroup.tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm">{getTypeIcon(task.type)}</span>
                                <h4 className="text-sm font-medium truncate">{task.title}</h4>
                                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {task.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due {formatDate(task.dueDate)}</span>
                              </div>
                            )}
                            {task.estimatedDuration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(task.estimatedDuration)}</span>
                              </div>
                            )}
                            <span className="ml-auto">#{task.id}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-medium mb-2">No tasks in this group</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddTasksToGroup(viewingGroup.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tasks
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="border-t p-4 flex justify-between gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => handleEditGroup(viewingGroup)}
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => handleDeleteGroup(viewingGroup.id)}
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </>
    )}
  </SheetContent>
</Sheet>

        {/* Edit Group Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task Group</DialogTitle>
            </DialogHeader>
            {selectedGroup && (
              <TaskGroupForm
                groupId={selectedGroup.id}
                initialValues={{
                  name: selectedGroup.name,
                  description: selectedGroup.description || "",
                }}
                onSuccess={() => {
                  setIsEditDialogOpen(false)
                  setSelectedGroup(null)
                  if (viewingGroup && viewingGroup.id === selectedGroup.id) {
                    queryClient.invalidateQueries({ queryKey: ["task-groups"] })
                  }
                }}
                onCancel={() => {
                  setIsEditDialogOpen(false)
                  setSelectedGroup(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tasks to Group</DialogTitle>
              <DialogDescription>
                Select tasks to add to this group
              </DialogDescription>
            </DialogHeader>
            {selectedTaskGroupId && (
              <AddTasksToGroupForm
                groupId={selectedTaskGroupId}
                onSuccess={() => {
                  setIsAddTaskDialogOpen(false)
                  setSelectedTaskGroupId(null)
                  queryClient.invalidateQueries({ queryKey: ["task-groups"] })
                  queryClient.invalidateQueries({ queryKey: ["tasks"] })
                  if (viewingGroup && viewingGroup.id === selectedTaskGroupId) {
                    setIsViewTasksOpen(true)
                  }
                }}
                onCancel={() => {
                  setIsAddTaskDialogOpen(false)
                  setSelectedTaskGroupId(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}