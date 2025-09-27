"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Lock, PlayCircle, ClipboardList } from "lucide-react"

interface ChecklistStep {
  step: string
  title: string
  description: string
  icon: string
  completed: boolean
  current: boolean
  locked: boolean
}

export default function SupplierOnboardingWizard() {
  const [steps, setSteps] = useState<ChecklistStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchChecklist = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/onboarding/checklist")
      if (!response.ok) throw new Error("Failed to fetch onboarding checklist")
      const data = await response.json()
      setSteps(data.checklist || [])
      setError("")
    } catch {
      setError("Failed to load onboarding checklist")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchChecklist() }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-blue-500" />
        Onboarding Checklist
      </h2>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : steps.length === 0 ? (
          <Card className="text-center py-10">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No onboarding steps found</p>
          </Card>
        ) : (
          steps.map(step => (
            <Card
              key={step.step}
              className={`transition-all duration-200 hover:shadow-md ${
                step.completed
                  ? "border-green-500/30"
                  : step.locked
                  ? "border-gray-300 opacity-60"
                  : "border-blue-500/30"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span>{step.icon}</span>
                  {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {step.completed ? (
                  <Button size="sm" disabled className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Completed
                  </Button>
                ) : step.locked ? (
                  <Button size="sm" disabled variant="outline">
                    <Lock className="h-4 w-4 mr-1" /> Locked
                  </Button>
                ) : step.current ? (
                  <Button size="sm">
                    <PlayCircle className="h-4 w-4 mr-1" /> Start
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
