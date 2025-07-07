"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, CheckCircle, Clock, Users, Zap, ArrowRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { toast } from "sonner"

export function LandingPage() {
  const { login, register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await login(email, password)
      toast.success("Welcome back!")
    } catch (error) {
      toast.error("Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    try {
      await register({ email, password, firstName, lastName })
      toast.success("Account created successfully!")
    } catch (error) {
      toast.error("Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                TaskMaster
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> AI</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Revolutionize your productivity with AI-powered task management. Smart prioritization, intelligent
                scheduling, and automated workflows.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                <Brain className="h-8 w-8 text-blue-400" />
                <div>
                  <h3 className="font-semibold text-white">AI Prioritization</h3>
                  <p className="text-sm text-slate-400">Smart task ranking</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                <Clock className="h-8 w-8 text-purple-400" />
                <div>
                  <h3 className="font-semibold text-white">Pomodoro AI</h3>
                  <p className="text-sm text-slate-400">Optimized scheduling</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                <Users className="h-8 w-8 text-green-400" />
                <div>
                  <h3 className="font-semibold text-white">Smart Batching</h3>
                  <p className="text-sm text-slate-400">Group similar tasks</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-white">Auto Dependencies</h3>
                  <p className="text-sm text-slate-400">Infer task relationships</p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Welcome</CardTitle>
                <CardDescription className="text-slate-300">
                  Sign in to your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10">
                    <TabsTrigger value="login" className="text-white data-[state=active]:bg-white/20">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-white data-[state=active]:bg-white/20">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">
                          Password
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                          placeholder="Enter your password"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-white">
                            First Name
                          </Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-white">
                            Last Name
                          </Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">
                          Password
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          minLength={8}
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Powered by Advanced AI</h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Experience the future of task management with intelligent automation and insights
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <Brain className="h-12 w-12 text-blue-400 mb-4" />
              <CardTitle className="text-white">Intelligent Prioritization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                AI analyzes your tasks, deadlines, and work patterns to automatically prioritize your workload for
                maximum productivity.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
              <CardTitle className="text-white">Smart Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Automatically infer task relationships and dependencies, ensuring you complete work in the optimal
                order.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <Clock className="h-12 w-12 text-purple-400 mb-4" />
              <CardTitle className="text-white">Pomodoro Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                AI-generated Pomodoro schedules that adapt to your energy levels and task complexity for peak
                performance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
