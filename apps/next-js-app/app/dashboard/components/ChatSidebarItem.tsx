"use client"

// Next.js
import { useRouter } from "next/navigation"
import { useCallback } from "react"

// UI Components
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

// Lucide Icons
import { CalendarIcon, ClockIcon, MessageCircleIcon } from "lucide-react"

// Constants
import { Chat } from "../actions/constants"

interface ChatSidebarItemProps {
  chat: Chat
  isSelected: boolean
}

export function ChatSidebarItem({ chat, isSelected }: ChatSidebarItemProps) {
  // Set router
  const router = useRouter()

  // Helper to format date time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  // Handle chat on click
  const handleChatOnClick = useCallback((chatId: string) => {
    router.push(`/dashboard/${chatId}`)
  }, [router])

  return (
    <SidebarMenuItem className="mb-2">
      <SidebarMenuButton
        className={`h-auto p-4 rounded-lg border transition-colors cursor-pointer 
          ${isSelected
            ? "border-primary/10 bg-accent text-primary"
            : "border-primary/10 bg-card hover:bg-accent"
          }`}
        onClick={() => handleChatOnClick(chat.ID)}
      >
        <div className="flex flex-col w-full space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircleIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm truncate">
              {chat.Name}
            </span>
          </div>

          <div className="flex flex-col space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span className="truncate">Created on {formatDateTime(chat.CreatedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span className="truncate">Updated on {formatDateTime(chat.UpdatedAt)}</span>
            </div>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
