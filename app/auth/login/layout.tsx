import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"

// This route reads cookies on the server to redirect authenticated users

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  try {
    // Server-side guard: if an admin is already authenticated, redirect immediately
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (token) {
      try {
        const payload = verifyToken(token)
        
        // Only redirect if payload is valid and contains a role
        if (payload && payload.role) {
          const role = payload.role.toLowerCase().trim()
          
          // Admin users get redirected to admin dashboard
          if (role === "fm_admin" || role === "fa_admin" || role === "admin") {
            redirect("/dashboard/admin")
          }
          
          // Non-admin users go to their dashboards (middleware can further guard access)
          if (role === "buyer") {
            redirect("/dashboard/buyer")
          }
          if (role === "supplier") {
            redirect("/dashboard/supplier")
          }
        }
      } catch (tokenError) {
        // If token verification fails, clear the invalid token
        console.log("Invalid token detected, allowing login page to display")
        // Let the page render normally - the client will handle clearing the invalid token
      }
    }
  } catch (error) {
    // If there's any error with cookie handling, let the login page render
    console.error("Error in login layout:", error)
  }

  return <>{children}</>
}