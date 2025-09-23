"use client"
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, Building, FileText, CheckCircle, BarChartIcon } from "lucide-react";
import { AdminPaymentQueue } from "@/components/admin-payment-queue";
import { AdminApplicationsTable } from "@/components/admin-applications-table";
import { AdminDocumentsTable } from "@/components/admin-documents-table";
import { AdminBankingTable } from "@/components/admin-banking-table";
// Fallback stubs for missing chart components
const ChartContainer = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const ReBarChart = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const XAxis = (props: any) => null;
const YAxis = (props: any) => null;
const Bar = (props: any) => null;
const ChartTooltip = (props: any) => null;
const ChartLegend = (props: any) => null;
const RePieChart = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const Pie = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const Cell = (props: any) => null;
const ChartTooltipContent = (props: any) => null;
const ChartLegendContent = (props: any) => null;

// TODO: Replace with real analytics and refreshTrigger sources
const analytics: any = null;
const refreshTrigger = 0;

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("applications");
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
      <div className="container mx-auto py-8 space-y-8">
        {/* ...existing header, stats, analytics cards... */}
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-2xl">
            <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
              <Clock className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
              <Building className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
              <FileText className="h-4 w-4" />
              Document Review
            </TabsTrigger>
            <TabsTrigger value="banking" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
              <CheckCircle className="h-4 w-4" />
              Banking
            </TabsTrigger>
            {analytics && (
              <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
                <BarChartIcon className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="payments" className="space-y-4">
            <Card className="bg-card border border-border rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-xl font-bold">Payment Queue</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">Review, approve, and execute supplier payments</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AdminPaymentQueue tabActive={activeTab === "payments"} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="applications" className="space-y-4">
            <Card className="bg-card border border-border rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span className="text-xl font-bold">KYC Applications</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">Review and manage all KYC applications from suppliers and buyers</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AdminApplicationsTable refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="space-y-4">
            <Card className="bg-card border border-border rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-xl font-bold">Document Review Queue</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">Review individual documents and update their verification status</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AdminDocumentsTable refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="banking" className="space-y-4">
            <Card className="bg-card border border-border rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-xl font-bold">Banking Verification</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">Verify supplier banking details to unlock premium features</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AdminBankingTable />
              </CardContent>
            </Card>
          </TabsContent>
          {analytics && (
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pipeline Bar Chart */}
                <Card className="bg-card border border-border">
                  <CardHeader>
                    <CardTitle>Application Pipeline</CardTitle>
                    <CardDescription>Stage distribution of KYC applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        pending: { label: "Pending", color: "hsl(45, 93%, 47%)" },
                        under_review: { label: "In Review", color: "hsl(28, 97%, 53%)" },
                        approved: { label: "Approved", color: "hsl(142, 72%, 45%)" },
                        rejected: { label: "Rejected", color: "hsl(0, 84%, 60%)" },
                      }}
                      className="w-full"
                    >
                      <ReBarChart data={[{ name: "Pipeline", ...(analytics ? analytics.pipeline : {}) }]}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="pending" fill="var(--color-pending)" />
                        <Bar dataKey="under_review" fill="var(--color-under_review)" />
                        <Bar dataKey="approved" fill="var(--color-approved)" />
                        <Bar dataKey="rejected" fill="var(--color-rejected)" />
                        <ChartLegend content={<ChartLegendContent />} />
                      </ReBarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
                {/* Invitations Pie Chart */}
                <Card className="bg-card border border-border">
                  <CardHeader>
                    <CardTitle>Invitation Funnel</CardTitle>
                    <CardDescription>Opened → Registered → Completed vs Expired</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        opened: { label: "Opened", color: "hsl(199, 89%, 48%)" },
                        registered: { label: "Registered", color: "hsl(262, 83%, 58%)" },
                        completed: { label: "Completed", color: "hsl(142, 72%, 45%)" },
                        expired: { label: "Expired", color: "hsl(0, 84%, 60%)" },
                      }}
                      className="w-full"
                    >
                      <RePieChart>
                        <Pie
                          data={analytics ? [
                            { name: "opened", value: analytics.invitations.opened },
                            { name: "registered", value: analytics.invitations.registered },
                            { name: "completed", value: analytics.invitations.completed },
                            { name: "expired", value: analytics.invitations.expired },
                          ] : []}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          label
                        >
                          <Cell name="opened" fill="var(--color-opened)" />
                          <Cell name="registered" fill="var(--color-registered)" />
                          <Cell name="completed" fill="var(--color-completed)" />
                          <Cell name="expired" fill="var(--color-expired)" />
                        </Pie>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </RePieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
// ...duplicate code removed...
