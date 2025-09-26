import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SupplierStatusPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md bg-white border border-border shadow-sm text-foreground">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full border border-green-200 bg-green-50">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Onboarding Complete!</CardTitle>
          <CardDescription className="text-base mt-2">
            Congratulations! Your supplier account is fully verified and active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl p-4 border border-green-200 bg-green-50 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="font-medium">You now have full access to the Supplier Dashboard.</span>
          </div>
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
            <Link href="/dashboard/supplier">Go to Supplier Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
