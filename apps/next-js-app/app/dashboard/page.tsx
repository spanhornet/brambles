"use client"

// app/dashboard/page.tsx

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your dashboard. Select a chat from the sidebar to get started.
        </p>
      </div>
    </div>
  )
}