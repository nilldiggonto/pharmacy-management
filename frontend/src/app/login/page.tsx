"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FirstAidKit, LockSimple, SignIn, UserCircle } from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { getDefaultRouteForRole, ROLE_DIRECTORY } from "@/lib/rbac";
import type { UserRole } from "@/types/api";

const ROLE_LIST = Object.values(ROLE_DIRECTORY);

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInAsRolePreview } = useApp();

  const [email, setEmail] = useState("owner@pharmacy.com");
  const [password, setPassword] = useState("OwnerPass123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");

  const navigateAfterLogin = (role: UserRole) => {
    if (nextParam && nextParam.startsWith("/")) {
      router.push(nextParam);
    } else {
      router.push(getDefaultRouteForRole(role));
    }
  };

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
    if (res.ok && res.user) {
      navigateAfterLogin(res.user.role);
    } else {
      setError(
        `${res.error ?? "Unable to reach backend API."} Confirm FastAPI is running on port 8000, or use Role Preview.`
      );
    }
  };

  const handleQuickFill = (role: UserRole) => {
    const meta = ROLE_DIRECTORY[role];
    setEmail(meta.demoEmail);
    setPassword(meta.demoPassword);
    setError(null);
  };

  const handlePreviewRole = (role: UserRole) => {
    const u = signInAsRolePreview(role);
    navigateAfterLogin(u.role);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1C1917] px-4 py-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 title-4 text-[#57534E] hover:text-[#B91C1C] transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            <span>Back to public site</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B91C1C] text-[#FFFDF9] shadow-xs">
              <FirstAidKit size={18} weight="fill" />
            </span>
            <div>
              <span className="title-4 text-[#1C1917] block leading-tight">MedGrid Admin Portal</span>
              <span className="caption-5 text-[#991B1B] block">Uttara Main Hub & 7 Dhaka Branches</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Primary FastAPI Credentials Form */}
          <div className="rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs lg:col-span-5">
            <p className="caption-3 font-semibold uppercase tracking-widest text-[#B91C1C]">
              Restricted Staff Access
            </p>
            <h1 className="mt-2 heading-5 text-[#1C1917]">Sign in to operations</h1>
            <p className="mt-1 body-6 text-[#57534E]">
              Authenticate with your staff credentials to manage inventory, wholesale orders, and branch transfers in real time.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Staff email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 body-6 text-[#1C1917] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="password" className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 body-6 text-[#1C1917] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15 focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 caption-4 text-[#991B1B]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#B91C1C] px-4 button-sm text-[#FFFDF9] transition-[background-color,transform] duration-200 hover:bg-[#991B1B] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <SignIn size={16} weight="bold" />
                <span>{submitting ? "Signing in..." : "Sign in"}</span>
              </button>

              <p className="flex items-center gap-1.5 caption-5 text-[#78716C]">
                <LockSimple size={13} />
                Protected by JWT access rotation, SSE real-time sync, and location RBAC.
              </p>
            </form>
          </div>

          {/* Multi Role Directory & Quick Switch */}
          <div className="rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs lg:col-span-7">
            <div>
              <h2 className="title-2 text-[#1C1917]">Seeded staff roles (Live PostgreSQL)</h2>
              <p className="caption-4 text-[#57534E] mt-0.5">
                Click Fill Login to sign in with live backend data for any role, or Preview to test permissions offline.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ROLE_LIST.map((item) => (
                <div
                  key={item.role}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0]/70 p-3.5 transition-colors hover:border-[#FECACA]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCircle size={18} weight="duotone" className="text-[#B91C1C]" />
                      <span className="title-4 text-[#1C1917]">{item.label}</span>
                    </div>
                    <p className="mt-1 caption-5 text-[#57534E]">{item.description}</p>
                    <p className="mt-1.5 font-mono caption-5 text-[#78716C] truncate">
                      {item.demoEmail}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickFill(item.role)}
                      className="flex-1 rounded-lg border border-[#DDD2C2] bg-[#FFFDF9] px-2.5 py-1.5 button-xsm text-[#1C1917] hover:border-[#B91C1C]/50 hover:text-[#991B1B] cursor-pointer transition-colors"
                    >
                      Fill Login
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreviewRole(item.role)}
                      className="flex-1 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 button-xsm text-[#991B1B] hover:bg-[#B91C1C] hover:text-[#FFFDF9] transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6F0]" />}>
      <LoginFormContent />
    </Suspense>
  );
}
