"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cube, LockSimple, SignIn } from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useApp();
  const [email, setEmail] = useState("owner@pharmacy.com");
  const [password, setPassword] = useState("OwnerPass123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email address and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (res.ok) {
      router.push("/");
    } else {
      setError(
        `${res.error ?? "Unable to reach backend API."} Confirm FastAPI is running on port 8000.`
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000000] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-col items-start gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981]">
              <Cube size={20} weight="duotone" />
            </span>
            <span className="title-2 text-[#f5f5f4]">MedGrid Command</span>
          </div>
          <CardTitle className="heading-6">Sign in to live backend</CardTitle>
          <p className="body-6 text-[#a8a29e]">
            Connect to your local FastAPI server to sync real inventory, batches, and POS sales.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="caption-4 text-[#d6d3d1] block mb-1">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@pharmacy.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="caption-4 text-[#d6d3d1] block mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-3 caption-4 text-[#fb7185]">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
              <SignIn size={16} weight="bold" />
              <span>{submitting ? "Connecting..." : "Connect and sign in"}</span>
            </Button>

            <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#272727]">
              <span className="flex items-center gap-1.5 caption-5 text-[#78716c]">
                <LockSimple size={13} />
                Seeded: owner@pharmacy.com
              </span>
              <Link href="/" className="caption-4 text-[#10b981] hover:underline">
                Return to dashboard
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

