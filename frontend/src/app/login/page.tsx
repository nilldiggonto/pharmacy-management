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
        `${res.error ?? "Unable to reach backend API."} Confirm FastAPI is running on port 8000, or use Role Preview below.`
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
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] px-4 py-10">
      <div className="mx-auto max-w-[960px]">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 title-4 text-[#525252] hover:text-[#0a0a0a] transition-colors duration-300"
          >
            <ArrowLeft size={16} />
            <span>Back to public site</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff1f7a] text-[#ffffff]">
              <FirstAidKit size={16} weight="fill" />
            </span>
            <span className="title-4 text-[#0a0a0a]">MedGrid Staff Portal</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Primary FastAPI Credentials Form */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-6 sm:p-8 lg:col-span-5">
            <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
              Restricted Access
            </p>
            <h1 className="mt-2 heading-5 text-[#0a0a0a]">Sign in to operations</h1>
            <p className="mt-1 body-6 text-[#525252]">
              Authenticate with your staff credentials to access your role workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="caption-4 text-[#0a0a0a] block mb-1">
                  Staff email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="password" className="caption-4 text-[#0a0a0a] block mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-[#ff1f7a]/30 bg-[#fff0f6] p-3 caption-4 text-[#be125c]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#ff1f7a] px-4 button-sm text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <SignIn size={16} weight="bold" />
                <span>{submitting ? "Signing in..." : "Sign in via FastAPI"}</span>
              </button>

              <p className="flex items-center gap-1.5 caption-5 text-[#737373]">
                <LockSimple size={13} />
                Protected by JWT access rotation and location scoped RBAC.
              </p>
            </form>
          </div>

          {/* Multi Role Directory & Quick Switch */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6 sm:p-8 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="title-2 text-[#0a0a0a]">Seeded staff roles</h2>
                <p className="caption-4 text-[#525252]">
                  Click Fill to load credentials for live FastAPI login, or Preview to test role permissions immediately.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ROLE_LIST.map((item) => (
                <div
                  key={item.role}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCircle size={17} weight="duotone" className="text-[#ff1f7a]" />
                      <span className="title-4 text-[#0a0a0a]">{item.label}</span>
                    </div>
                    <p className="mt-1 caption-5 text-[#525252]">{item.description}</p>
                    <p className="mt-1.5 font-mono caption-5 text-[#737373] truncate">
                      {item.demoEmail}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickFill(item.role)}
                      className="flex-1 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-1.5 button-xsm text-[#0a0a0a] hover:border-[#ff1f7a]/50 cursor-pointer"
                    >
                      Fill Login
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreviewRole(item.role)}
                      className="flex-1 rounded-lg bg-[#fff0f6] border border-[#ff1f7a]/25 px-2.5 py-1.5 button-xsm text-[#be125c] hover:bg-[#ff1f7a] hover:text-[#ffffff] transition-colors duration-300 cursor-pointer"
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
    <Suspense fallback={<div className="min-h-screen bg-[#ffffff]" />}>
      <LoginFormContent />
    </Suspense>
  );
}
