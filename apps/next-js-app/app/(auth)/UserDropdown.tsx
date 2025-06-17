"use client";

// Custom Hooks
import { useSession } from "@/lib/hooks/useSession";

// Next.js Hooks
import { useRouter } from "next/navigation";

// UI Components
import { Button } from "@/components/ui/button";
import Avatar from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lucide Icons
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  LightbulbIcon,
  UserPenIcon,
} from "lucide-react";

export function UserDropdown() {
  // Set router
  const router = useRouter();

  const {
    signOut,
    user,
    isLoading,
    isError,
    error,
    refetch,
  } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user?.firstName || !user?.lastName) return "U";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  // Helper function to get full name
  const getFullName = () => {
    if (!user?.firstName || !user?.lastName) return "User";
    return `${user.firstName} ${user.lastName}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-3 px-3 py-3 h-auto w-full rounded-lg border border-border/50 bg-card hover:bg-accent transition-colors"
            aria-label="Open account menu"
          >
            <Avatar
              initials={getUserInitials()}
              className="size-10"
            />
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              <span className="font-medium text-sm truncate">
                {getFullName()}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
            <ChevronsUpDownIcon size={16} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuLabel className="px-3 py-3 font-normal">
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              <span className="font-medium text-sm truncate">
                {getFullName()}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { }} className="cursor-pointer">
            <LightbulbIcon size={16} aria-hidden="true" />
            <span>Share feedback</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { }} className="cursor-pointer">
            <UserPenIcon size={16} aria-hidden="true" />
            <span>Update profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOutIcon size={16} aria-hidden="true" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}