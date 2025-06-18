"use client"

// app/dashboard/[chatId]/page.tsx

// Framer Motion
import { AnimatePresence, motion } from "motion/react"

// Custom Hooks
import { useChats } from "@/app/dashboard/hooks/useChats"
import { useDocuments } from "@/app/dashboard/hooks/useDocuments"
import { formatBytes } from "@/lib/hooks/useFileUpload"

// Next.js Hooks
import { useParams } from "next/navigation"

// UI Components
import { InputDocument } from "@/components/ui/input.document"
import {
  useSidebar,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle"

// Lucide Icons
import { FileTextIcon, CalendarIcon } from "lucide-react"

export default function ChatIdPage() {
  // Get parameters
  const params = useParams()
  const chatId = params.chatId as string

  // Set states
  const { open } = useSidebar()

  // Fetch chat
  const { data: chats } = useChats()
  const chat = chats?.find(chat => chat.ID === chatId)

  // Fetch documents
  const { data: documents, createDocument, enqueueDocument } = useDocuments(chatId)

  // Handle document upload
  const handleOnUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chatId', chatId)

    try {
      // Upload the document
      const uploadResult = await createDocument.mutateAsync(formData)
      console.log('Document uploaded successfully:', uploadResult)

      // Automatically enqueue the document for processing
      if (uploadResult?.ID) {
        try {
          const enqueueResult = await enqueueDocument.mutateAsync(uploadResult.ID)
          console.log('Document enqueued for processing:', enqueueResult)
        } catch (enqueueError) {
          console.error('Failed to enqueue document:', enqueueError)
          // Note: Document was uploaded successfully, just enqueueing failed
        }
      }

      return uploadResult
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }

  // Helper to format date time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex h-screen flex-col">
      <motion.header
        layout="position"
        className="flex items-center border-b p-4"
      >
        <AnimatePresence initial={false}>
          {!open && (
            <motion.div
              key="sidebar-trigger"
              layout="position"
              initial={{ opacity: 0, x: -128 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -128 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex items-center gap-1"
            >
              <SidebarTrigger aria-label="Toggle sidebar" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout="position"
          className="ml-auto"
          transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
        >
          <ModeToggle />
        </motion.div>
      </motion.header>

      <div className="flex h-full flex-1 overflow-hidden flex-col md:flex-row">
        <aside
          className="shrink-0 border-b md:w-1/3 md:max-w-sm md:border-b-0 md:border-r"
          role="complementary"
          aria-label="Documents list"
        >
          <ScrollArea className="h-full space-y-4 p-4">
            <InputDocument
              accept={["application/pdf"]}
              onUpload={handleOnUpload}
            />

            <div className="mt-4 space-y-2">
              {documents && documents.map((document) => (
                <div
                  key={document.ID}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded border">
                    <FileTextIcon className="size-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{document.FileName}</p>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="flex flex-wrap items-center gap-1">
                        <CalendarIcon className="size-3" />
                        <span>{formatDate(document.CreatedAt)}</span>
                        <span>∙</span>
                        <span>{formatBytes(document.FileSize)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main
          className="flex flex-1 flex-col"
          role="main"
          aria-label="Messages list"
        >
          <ScrollArea className="flex-1 space-y-3 p-4">
            Messages will go here
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}