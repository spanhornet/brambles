"use client"

// app/(auth)/sign-up/page.tsx

// UI Components
import { SignUpForm } from "./components/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="mx-auto max-w-md w-full px-4 py-12 sm:px-6 lg:px-8">
        <SignUpForm />
      </div>
    </div>
  );
}