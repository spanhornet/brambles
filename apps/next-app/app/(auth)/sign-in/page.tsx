"use client"

// Next.js Hooks
import { useTheme } from "next-themes";

// UI Components
import { SignInForm } from "./components/SignInForm";

export default function SignUpPage() {
  // Get the current theme
  const { theme } = useTheme();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <SignInForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block">
        {theme === "dark" ? (
          <img
            src="/bg-dark-image.png"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : (
          <img
            src="/bg-light-image.png"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
      </div>
    </div>
  );
}