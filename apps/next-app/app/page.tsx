"use client"

// UI Components
import { Button } from "@/components/ui/button";

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle";

// Next.js Hooks
import { useRouter } from "next/navigation";

// React Query Hooks
import { useSession } from "@/lib/hooks/useSession";

// Lucide Icons
import { LoaderCircle } from "lucide-react";

export default function Home() {
  // Set router
  const router = useRouter();

  // Get session
  const {
    user,
    isLoading,
    isError,
    error,
    refetch,
    signOut,
  } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isError && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <ModeToggle />

      {user && (
        <div className="space-y-2">
          <pre className="bg-muted p-4 rounded-md">{JSON.stringify(user, null, 2)}</pre>
          <Button onClick={handleSignOut}>Sign Out</Button>
        </div>
      )}
    </div>
  );
}