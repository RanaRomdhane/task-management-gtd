"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, RotateCcw, Clock, CheckCircle2, Brain, Loader2, Timer } from "lucide-react"
import { tasksApi, type Task } from "@/lib/api/tasks"
import { toast } from "sonner"

interface PomodoroSession {
  taskId: number
  taskTitle: string
  duration: number
  completed: boolean
}

export function PomodoroPage() {
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [timeLeft, setTimeLeft] = useState(35 * 60) // Changed to 35 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const [sessionType, setSessionType] = useState<"work" | "break">("work")
  const [completedSessions, setCompletedSessions] = useState<PomodoroSession[]>([])
  const [pomodoroSchedule, setPomodoroSchedule] = useState<(Task & { pomodoroCount?: number })[]>([])

  const queryClient = useQueryClient()

  // Get all tasks for fallback
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.getTasks,
  })

  const generateScheduleMutation = useMutation({
    mutationFn: tasksApi.getPomodoroSchedule,
    onSuccess: (data) => {
      console.log("Pomodoro schedule received:", data)
      setPomodoroSchedule(data)
      toast.success(`Generated schedule with ${data.length} tasks`)
    },
    onError: (error) => {
      console.error("Failed to generate schedule:", error)
      toast.error("Failed to generate Pomodoro schedule")
      // Fallback: use regular tasks
      const fallbackSchedule = allTasks
        .filter((task) => task.status !== "done")
        .slice(0, 5)
        .map((task) => ({
          ...task,
          pomodoroCount: Math.ceil((task.estimatedDuration || 30) / 35) || 1, // Changed to 35 minutes
        }))
      setPomodoroSchedule(fallbackSchedule)
      toast.success(`Using fallback schedule with ${fallbackSchedule.length} tasks`)
    },
  })

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Session completed
      handleSessionComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  const handleSessionComplete = () => {
    setIsActive(false)

    if (sessionType === "work" && currentSession) {
      // Mark work session as completed
      const completedSession = { ...currentSession, completed: true }
      setCompletedSessions((prev) => [...prev, completedSession])
      toast.success(`Completed: ${currentSession.taskTitle}`)

      // Start break
      setSessionType("break")
      setTimeLeft(5 * 60) // 5 minute break
      toast.success("Time for a break!")
    } else {
      // Break completed, ready for next work session
      setSessionType("work")
      setTimeLeft(35 * 60) // Changed to 35 minutes
      setCurrentSession(null)
      toast.success("Break over! Ready for the next task.")
    }
  }

  const startTimer = () => {
    setIsActive(true)
  }

  const pauseTimer = () => {
    setIsActive(false)
  }

  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(sessionType === "work" ? 35 * 60 : 5 * 60) // Changed to 35 minutes
  }

  const startTaskSession = (task: Task & { pomodoroCount?: number }) => {
    if (isActive) {
      pauseTimer()
    }

    setCurrentSession({
      taskId: task.id,
      taskTitle: task.title,
      duration: 35, // Changed to 35 minutes
      completed: false,
    })
    setSessionType("work")
    setTimeLeft(35 * 60) // Changed to 35 minutes
    setIsActive(false)
    toast.success(`Selected task: ${task.title}`)
  }

  const generateSchedule = () => {
    generateScheduleMutation.mutate()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const totalSessions = pomodoroSchedule.reduce((acc, task) => acc + (task.pomodoroCount || 1), 0)
  const completedSessionsCount = completedSessions.length
  const progressPercentage = totalSessions > 0 ? (completedSessionsCount / totalSessions) * 100 : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h1>
          <p className="text-muted-foreground">AI-optimized Pomodoro sessions for maximum productivity</p>
        </div>

        {/* Timer Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Timer Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Timer className="h-6 w-6" />
                <span>{sessionType === "work" ? "Work Session (35 min)" : "Break Time (5 min)"}</span>
              </CardTitle>
              {currentSession && (
                <CardDescription className="text-lg font-medium">{currentSession.taskTitle}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div className="text-6xl font-bold font-mono text-primary mb-4">{formatTime(timeLeft)}</div>
                <div className="w-full bg-muted rounded-full h-3 mb-4">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      sessionType === "work" ? "bg-blue-500" : "bg-green-500"
                    }`}
                    style={{
                      width: `${
                        (((sessionType === "work" ? 35 * 60 : 5 * 60) - timeLeft) /
                          (sessionType === "work" ? 35 * 60 : 5 * 60)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={isActive ? pauseTimer : startTimer}
                  disabled={!currentSession && sessionType === "work"}
                  size="lg"
                  className="px-8"
                >
                  {isActive ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
              </div>

              {!currentSession && sessionType === "work" && (
                <p className="text-center text-sm text-muted-foreground">
                  Select a task from your AI schedule to start a Pomodoro session
                </p>
              )}
            </CardContent>
          </Card>

          {/* Session Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Today's Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completed Sessions</span>
                  <span>
                    {completedSessionsCount} / {totalSessions || "0"}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-500">{completedSessionsCount}</p>
                  <p className="text-xs text-muted-foreground">Sessions Done</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-500">
                    {Math.floor((completedSessionsCount * 35) / 60)}h {(completedSessionsCount * 35) % 60}m
                  </p>
                  <p className="text-xs text-muted-foreground">Time Focused</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recent Completions</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {completedSessions
                    .slice(-5)
                    .reverse()
                    .map((session, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="truncate">{session.taskTitle}</span>
                      </div>
                    ))}
                  {completedSessions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No sessions completed yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Schedule Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span>AI-Generated Pomodoro Schedule</span>
                </CardTitle>
                <CardDescription>
                  Optimized task sequence based on priority, complexity, and your productivity patterns
                </CardDescription>
              </div>
              <Button
                onClick={generateSchedule}
                disabled={generateScheduleMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generateScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Schedule
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pomodoroSchedule.length > 0 ? (
              <div className="space-y-3">
                {pomodoroSchedule.map((task, index) => {
                  const isCompleted = completedSessions.some((s) => s.taskId === task.id)
                  const isCurrentTask = currentSession?.taskId === task.id

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        isCurrentTask
                          ? "border-primary bg-primary/5"
                          : isCompleted
                            ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                            : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {task.description?.substring(0, 100) || "No description"}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.type}
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {task.pomodoroCount || 1} session{(task.pomodoroCount || 1) > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Button
                            size="sm"
                            variant={isCurrentTask ? "default" : "outline"}
                            onClick={() => startTaskSession(task)}
                            disabled={isActive && !isCurrentTask}
                            className="bg-transparent"
                          >
                            {isCurrentTask ? "Current" : "Start"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Schedule Generated</h3>
                <p className="text-muted-foreground mb-4">
                  Generate an AI-optimized Pomodoro schedule based on your current tasks
                </p>
                <Button onClick={generateSchedule} disabled={generateScheduleMutation.isPending}>
                  {generateScheduleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Schedule
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}