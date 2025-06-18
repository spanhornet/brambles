"use client"

// app/dashboard/[chatId]/page.tsx

// Framer Motion
import { AnimatePresence, motion } from "motion/react"

// Custom Hooks
import { useChats } from "@/app/dashboard/hooks/useChats"

// Next.js Hooks
import { useParams } from "next/navigation"

// UI Components
import {
  useSidebar,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle"

export default function ChatIdPage() {
  // Get parameters
  const params = useParams()
  const chatId = params.chatId as string

  // Set states
  const { open } = useSidebar()

  // Fetch chat
  const { data: chats } = useChats()
  const chat = chats?.find(chat => chat.ID === chatId)

  return (
    <div className="flex flex-col h-screen">
      <motion.div
        layout="position"
        className="flex items-center border-b p-4"
      >
        <AnimatePresence initial={false}>
          {!open && (
            <motion.div
              key="left-buttons"
              layout="position"
              initial={{
                opacity: 0,
                x: -128
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -128
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex items-center gap-1"
            >
              <SidebarTrigger />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout="position"
          className="ml-auto"
          transition={{
            layout: {
              duration: 0.3,
              ease: "easeInOut"
            }
          }}
        >
          <ModeToggle />
        </motion.div>
      </motion.div>

      <div className="flex flex-1 h-full overflow-hidden flex-col md:flex-row">
        <aside
          className="w-full md:w-1/3 md:max-w-sm border-b md:border-b-0 md:border-r shrink-0"
          role="complementary"
          aria-label="Document list"
        >
          <ScrollArea className="h-full p-4 space-y-2">
            Documents will go here
          </ScrollArea>
        </aside>

        <main
          className="flex-1 flex flex-col"
          role="main"
          aria-label="Chat thread"
        >
          <ScrollArea className="flex-1 p-4 space-y-3">
            Messages will go here
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}