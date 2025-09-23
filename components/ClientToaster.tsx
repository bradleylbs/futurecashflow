"use client"

import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/hooks/use-toast"

// Enhanced toast helpers with modern styling
export const showToast = {
  success: (title: string, description?: string) =>
    toast({
      variant: "success" as any,
      title: `✅ ${title}`,
      description,
    }),
  
  error: (title: string, description?: string) =>
    toast({
      variant: "destructive",
      title: `❌ ${title}`,
      description,
    }),
  
  warning: (title: string, description?: string) =>
    toast({
      variant: "warning" as any,
      title: `⚠️ ${title}`,
      description,
    }),
  
  info: (title: string, description?: string) =>
    toast({
      variant: "info" as any,
      title: `ℹ️ ${title}`,
      description,
    }),
  
  default: (title: string, description?: string) =>
    toast({
      title,
      description,
    }),
}

export default function ClientToaster() {
  return (
    <Toaster />
  )
}
