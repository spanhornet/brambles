"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/clsx-handler"

interface AvatarProps extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  initials: string
}

export default function Avatar({ className, initials, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-700 font-medium uppercase",
        className
      )}
      {...props}
    >
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        delayMs={0}
        className="text-sm"
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
