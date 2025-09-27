"use client"

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState({
    company_name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/supplier/profile", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
    setError("");
    setSuccess("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/supplier/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to update profile");
        return;
      }
      setSuccess("Profile updated successfully.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Card className="w-full max-w-xl bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center pb-6">
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your company and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" name="company_name" value={profile.company_name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" value={profile.email} onChange={handleChange} required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={profile.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={profile.address} onChange={handleChange} />
            </div>
            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
