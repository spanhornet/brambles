"use client"

// Next.js Hooks
import { useRouter } from "next/navigation";

// Custom Hooks
import { useSession } from "@/lib/hooks/useSession";

// UI Components
import { Button } from "@/components/ui/button";

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle";

// Lucide Icons
import { LogOutIcon } from "lucide-react";

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

  // Helper to sign out
  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-medium">Brambles</h1>
          <ModeToggle />
        </div>
        {user && (
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">User Session</h2>
            <div className="space-y-2">
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">{JSON.stringify(user, null, 2)}</pre>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOutIcon className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
