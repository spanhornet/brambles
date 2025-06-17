"use client"

// app/dashboard/[chatId]/page.tsx

// Framer Motion
import { AnimatePresence, motion } from "motion/react"

// Custom Hooks
import { useChat } from "@/app/dashboard/hooks/useChats"

// Next.js Hooks
import { useParams } from "next/navigation"

// UI Components
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle"

export default function ChatIdPage() {
  // Get parameters
  const params = useParams()
  const chatId = params.chatId as string

  // Set states
  const { open } = useSidebar()

  // Fetch chat
  const { data: chat } = useChat(chatId)

  return (
    <div className="flex flex-col h-full">
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

      <div className="p-4 flex-1 overflow-auto">
        Chat ID: {chatId}
      </div>
    </div>
  )
}