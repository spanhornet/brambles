"use client"

// Next.js Hooks
import { useParams, useRouter } from "next/navigation"
import { useCallback } from "react"

// Custom Hooks
import { useChats, useCreateChat } from "../hooks/useChats"

// UI Components
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

// Lucide Icons
import { PlusIcon } from "lucide-react"

// `ChatSidebarItem` Component
import { ChatSidebarItem } from "./ChatSidebarItem"

// `UserDropdown` Component
import { UserDropdown } from "@/app/(auth)/UserDropdown"

export function ChatSidebar() {
  // Set router
  const router = useRouter()

  // Get parameters
  const params = useParams()
  const selectedChatId = params?.chatId as string | undefined

  // Get chats
  const { data: chats } = useChats()

  // Get create chat mutation
  const createChatMutation = useCreateChat()

  // Handle chat on create
  const handleChatOnCreate = useCallback(async () => {
    try {
      const newChat = await createChatMutation.mutateAsync("New Chat")
      router.push(`/dashboard/${newChat.ID}`)
    } catch (error) {
      console.error("Failed to create chat:", error)
    }
  }, [createChatMutation, router])

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg flex items-center justify-center">
              <span className="text-base font-medium">Brambles</span>
            </div>
          </div>

          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarMenu className="space-y-2">
          <Button
            className="w-full"
            variant="outline"
            onClick={handleChatOnCreate}
          >
            <PlusIcon className="h-4 w-4" />
            Create chat
          </Button>

          {chats && chats.length > 0 && (
            chats
              .sort((a, b) => new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime())
              .map((chat) => (
                <ChatSidebarItem
                  key={chat.ID}
                  chat={chat}
                  isSelected={selectedChatId === chat.ID}
                />
              ))
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-2">
          <UserDropdown />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
