"use client"

// app/dashboard/layout.tsx

// Framer Motion
import { AnimatePresence, motion } from "motion/react"

// UI Components
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

// `ChatSidebar` Component
import { ChatSidebar } from "./components/ChatSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarProvider>
        <ChatSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}