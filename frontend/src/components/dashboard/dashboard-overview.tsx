"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Brain, Users, Zap, Plus } from "lucide-react"
import { tasksApi, TaskStatus, TaskPriority } from "@/lib/api/tasks"
import { format } from "date-fns"
import Link from "next/link"

export function DashboardOverview() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getTasks,
  })

  const { data: taskGroups = [] } = useQuery({
    queryKey: ["task-groups"],
    queryFn: tasksApi.getTaskGroups,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === TaskStatus.DONE).length,
    inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
    overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length,
  }

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  const priorityStats = {
    critical: tasks.filter((t) => t.priority === TaskPriority.CRITICAL && t.status !== TaskStatus.DONE).length,
    high: tasks.filter((t) => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE).length,
    medium: tasks.filter((t) => t.priority === TaskPriority.MEDIUM && t.status !== TaskStatus.DONE).length,
    low: tasks.filter((t) => t.priority === TaskPriority.LOW && t.status !== TaskStatus.DONE).length,
  }

  const recentTasks = tasks
    .filter((t) => t.status !== TaskStatus.DONE)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const upcomingTasks = tasks
    .filter((t) => t.dueDate && t.status !== TaskStatus.DONE)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your tasks and productivity.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/tasks">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.completed} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* AI Features Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span>AI Prioritization</span>
            </CardTitle>
            <CardDescription>
              Let AI analyze and prioritize your tasks based on deadlines and importance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/ai">
              <Button variant="outline" className="w-full bg-transparent">
                <Zap className="h-4 w-4 mr-2" />
                Prioritize Tasks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>Smart Batching</span>
            </CardTitle>
            <CardDescription>Group similar tasks together for more efficient workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/ai">
              <Button variant="outline" className="w-full bg-transparent">
                <Users className="h-4 w-4 mr-2" />
                Batch Tasks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span>Pomodoro Schedule</span>
            </CardTitle>
            <CardDescription>Get an AI-optimized Pomodoro schedule for maximum productivity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/pomodoro">
              <Button variant="outline" className="w-full bg-transparent">
                <Clock className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown & Recent Tasks */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Breakdown</CardTitle>
            <CardDescription>Tasks by priority level (excluding completed)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Critical</Badge>
              </div>
              <span className="font-medium">{priorityStats.critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>
              </div>
              <span className="font-medium">{priorityStats.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium</Badge>
              </div>
              <span className="font-medium">{priorityStats.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-500 hover:bg-green-600">Low</Badge>
              </div>
              <span className="font-medium">{priorityStats.low}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest tasks and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(task.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          task.priority === TaskPriority.CRITICAL
                            ? "destructive"
                            : task.priority === TaskPriority.HIGH
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent tasks found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks with approaching due dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(task.dueDate!), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        task.priority === TaskPriority.CRITICAL
                          ? "destructive"
                          : task.priority === TaskPriority.HIGH
                            ? "default"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge
                      variant={
                        new Date(task.dueDate!) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? "destructive" : "outline"
                      }
                      className="text-xs"
                    >
                      {new Date(task.dueDate!) < new Date()
                        ? "Overdue"
                        : new Date(task.dueDate!) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                          ? "Due Soon"
                          : "Upcoming"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
