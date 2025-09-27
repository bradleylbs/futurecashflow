"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
    } catch (error) {
      setError("Failed to load onboarding checklist")
      console.error("Fetch checklist error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchChecklist() }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Onboarding Checklist</h2>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card>Loading...</Card>
        ) : steps.length === 0 ? (
          <Card>No onboarding steps found</Card>
        ) : steps.map(step => (
          <Card key={step.step} className={step.completed ? "border-green-500" : step.locked ? "border-gray-300 opacity-50" : "border-blue-500"}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{step.icon}</span>
              <span className="font-semibold">{step.title}</span>
            </div>
            <div className="mb-2 text-sm text-gray-600">{step.description}</div>
            {step.completed ? (
              <Button size="sm" disabled variant="secondary">Completed</Button>
            ) : step.locked ? (
              <Button size="sm" disabled variant="outline">Locked</Button>
            ) : step.current ? (
              <Button size="sm" variant="default">Start</Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}
