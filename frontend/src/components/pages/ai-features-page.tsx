"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Brain, Zap, Users, TrendingUp, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { tasksApi, TaskPriority } from "@/lib/api/tasks"
import { toast } from "sonner"

export function AIFeaturesPage() {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getTasks,
  })

  const { data: taskGroups = [] } = useQuery({
    queryKey: ["task-groups"],
    queryFn: tasksApi.getTaskGroups,
  })

  const batchTasksMutation = useMutation({
    mutationFn: tasksApi.batchSimilarTasks,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task-groups"] })
      toast.success(`Created ${data.length} task batches successfully`)
      setIsProcessing(null)
    },
    onError: () => {
      toast.error("Failed to batch tasks")
      setIsProcessing(null)
    },
  })

  const prioritizeTasksMutation = useMutation({
    mutationFn: tasksApi.prioritizeTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Tasks prioritized successfully")
      setIsProcessing(null)
    },
    onError: () => {
      toast.error("Failed to prioritize tasks")
      setIsProcessing(null)
    },
  })

  const inferDependenciesMutation = useMutation({
    mutationFn: tasksApi.inferDependencies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Dependencies inferred successfully")
      setIsProcessing(null)
    },
    onError: () => {
      toast.error("Failed to infer dependencies")
      setIsProcessing(null)
    },
  })

  const handleBatchTasks = () => {
    setIsProcessing("batch")
    batchTasksMutation.mutate()
  }

  const handlePrioritizeTasks = () => {
    setIsProcessing("prioritize")
    prioritizeTasksMutation.mutate()
  }

  const handleInferDependencies = (taskId: number) => {
    setIsProcessing(`dependencies-${taskId}`)
    inferDependenciesMutation.mutate(taskId)
  }

  const stats = {
    total: tasks.length,
    batchable: tasks.filter((t) => t.isBatchable && !t.isBatched).length,
    batched: tasks.filter((t) => t.isBatched).length,
    withDependencies: tasks.filter((t) => t.dependencies && t.dependencies.length > 0).length,
    critical: tasks.filter((t) => t.priority === TaskPriority.CRITICAL).length,
    high: tasks.filter((t) => t.priority === TaskPriority.HIGH).length,
  }

  const batchableProgress = stats.total > 0 ? (stats.batchable / stats.total) * 100 : 0
  const dependencyProgress = stats.total > 0 ? (stats.withDependencies / stats.total) * 100 : 0

  const recentTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
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
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Features</h1>
          <p className="text-muted-foreground">
            Leverage artificial intelligence to optimize your task management workflow
          </p>
        </div>

        {/* AI Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Ready for AI processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batchable Tasks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.batchable}</div>
              <p className="text-xs text-muted-foreground">{stats.batched} already batched</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.critical + stats.high}</div>
              <p className="text-xs text-muted-foreground">
                {stats.critical} critical, {stats.high} high
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Dependencies</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withDependencies}</div>
              <p className="text-xs text-muted-foreground">Tasks with relationships</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Action Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Smart Batching */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span>Smart Task Batching</span>
              </CardTitle>
              <CardDescription>
                Group similar tasks together using AI analysis for more efficient workflow processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Batchable Tasks</span>
                  <span>{stats.batchable} available</span>
                </div>
                <Progress value={batchableProgress} className="h-2" />
              </div>
              <Button
                onClick={handleBatchTasks}
                disabled={stats.batchable === 0 || isProcessing === "batch"}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing === "batch" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Batch Similar Tasks
                  </>
                )}
              </Button>
              {stats.batchable === 0 && (
                <p className="text-xs text-muted-foreground">
                  No batchable tasks available. Mark tasks as batchable to use this feature.
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Prioritization */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <span>AI Prioritization</span>
              </CardTitle>
              <CardDescription>
                Let AI analyze your tasks and automatically adjust priorities based on deadlines and importance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasks to Analyze</span>
                  <span>{tasks.filter((t) => t.status !== "done").length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-xs">
                    {stats.critical} Critical
                  </Badge>
                  <Badge className="bg-orange-500 text-xs">{stats.high} High</Badge>
                </div>
              </div>
              <Button
                onClick={handlePrioritizeTasks}
                disabled={tasks.length === 0 || isProcessing === "prioritize"}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing === "prioritize" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Prioritize Tasks
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Dependency Inference */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Dependency Analysis</span>
              </CardTitle>
              <CardDescription>
                AI automatically infers task relationships and suggests dependencies for optimal workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasks with Dependencies</span>
                  <span>{stats.withDependencies}</span>
                </div>
                <Progress value={dependencyProgress} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                Select a task below to infer its dependencies using AI analysis.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks for Dependency Inference */}
        <Card>
          <CardHeader>
            <CardTitle>Infer Task Dependencies</CardTitle>
            <CardDescription>Select tasks to analyze for potential dependencies and subtasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.description ? task.description.substring(0, 100) + "..." : "No description"}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
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
                          {task.type}
                        </Badge>
                        {task.dependencies && task.dependencies.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {task.dependencies.length} dependencies
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInferDependencies(task.id)}
                      disabled={isProcessing === `dependencies-${task.id}`}
                      className="bg-transparent"
                    >
                      {isProcessing === `dependencies-${task.id}` ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Infer Dependencies
                        </>
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks available for dependency analysis
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span>AI Insights</span>
            </CardTitle>
            <CardDescription>Intelligent recommendations based on your task patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>Productivity Patterns</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Based on your task completion patterns, you're most productive with{" "}
                  {stats.total > 0 ? "medium-priority tasks" : "no data available yet"}.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Optimization Suggestions</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  {stats.batchable > 3
                    ? "Consider batching similar tasks to improve efficiency."
                    : "Mark more tasks as batchable to enable smart grouping."}
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Next Recommended Actions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {stats.batchable > 0 && <li>• Batch {stats.batchable} similar tasks for better workflow</li>}
                {stats.critical > 0 && <li>• Focus on {stats.critical} critical priority tasks first</li>}
                {stats.withDependencies < stats.total * 0.3 && (
                  <li>• Consider adding dependencies to improve task organization</li>
                )}
                <li>• Use AI prioritization to optimize your task order</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
