"use client"

// React Hooks
import { useState, useEffect, useRef } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle";

// Next.js Hooks
import { useRouter } from "next/navigation";

// React Query Hooks
import { useSession } from "@/lib/hooks/useSession";

// Lucide Icons
import {
  LoaderCircleIcon,
  LogOutIcon,
  PlayIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";

import { api } from "@/lib/api-handler";

interface StreamEvent {
  word?: string;
  index?: number;
  chatId?: string;
  status?: string;
  totalWords?: number;
}

export default function Home() {
  // Set router
  const router = useRouter();

  // Set State for streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedWords, setStreamedWords] = useState<string[]>([]);
  const [streamStatus, setStreamStatus] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get session
  const {
    user,
    isLoading,
    isError,
    error,
    refetch,
    signOut,
  } = useSession();

  // Set state for inactivity timer
  const INACTIVITY_TIMEOUT = 5000;
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set state for message
  const MESSAGE = "Hello, world! This is a demonstration of Server-Sent Events streaming words one by one. Each word appears with a slight delay to simulate real-time generation."

  // Add state for chat name
  const [chatName, setChatName] = useState("");

  // Add state for chats
  const [chats, setChats] = useState<any[]>([]);

  const saveLastSeenIndex = (index: number) => {
    localStorage.setItem("lastSeenIndex", index.toString());
  };

  const getLastSeenIndex = () => {
    return parseInt(localStorage.getItem("lastSeenIndex") || "0", 10);
  };

  const clearLastSeenIndex = () => {
    localStorage.removeItem("lastSeenIndex");
  };

  // Herlper to save streamed words
  const saveStreamedWords = (words: string[]) => {
    try {
      localStorage.setItem("streamedWords", JSON.stringify(words));
    } catch {
      // Ignore serialization errors
    }
  };

  // Helper to get streamed words
  const getStreamedWords = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem("streamedWords") || "[]");
    } catch {
      return [];
    }
  };

  // Helper to clear streamed words
  const clearStreamedWords = () => {
    localStorage.removeItem("streamedWords");
  };

  // Helper to clear inactivity timer
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  // Helper to reset inactivity timer
  const resetInactivityTimer = (resume: () => void) => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      console.warn("Inactivity timeout. Attempting to resume...");
      resume();
    }, INACTIVITY_TIMEOUT) as unknown as NodeJS.Timeout;
  };

  const parseSSELine = (line: string): { event: string; data: string } | null => {
    if (line.startsWith('event: ')) {
      return { event: line.slice(7), data: '' };
    }
    if (line.startsWith('data: ')) {
      return { event: '', data: line.slice(6) };
    }
    return null;
  };

  const resumeStreaming = async () => {
    const lastIndex = getLastSeenIndex();
    setStreamStatus(`Reconnecting from word ${lastIndex}...`);
    setIsStreaming(true);

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("http://localhost:8080/api/v1/chat/demo-chat/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSeenIndex: lastIndex,
          message: MESSAGE
        }),
        signal: abortController.signal,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Resume request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      resetInactivityTimer(resumeStreaming);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsStreaming(false);
          clearInactivityTimer();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const parsed = parseSSELine(line.trim());
          if (parsed?.event) currentEvent = parsed.event;
          else if (parsed?.data && currentEvent) {
            const data: StreamEvent = JSON.parse(parsed.data);

            switch (currentEvent) {
              case "word":
                if (data.word && typeof data.index === "number") {
                  if (!streamedWords.includes(data.word)) {
                    setStreamedWords((prev) => {
                      const updated = [...prev, data.word!];
                      saveStreamedWords(updated);
                      return updated;
                    });
                    saveLastSeenIndex(data.index);
                    resetInactivityTimer(resumeStreaming);
                  }
                }
                break;
              case "complete":
                setStreamStatus(`Completed: ${data.totalWords} words`);
                clearLastSeenIndex();
                clearInactivityTimer();
                setIsStreaming(false);
                break;
            }
            currentEvent = "";
          }
        }
      }
    } catch (error: any) {
      // Treat user-aborted streams silently
      const aborted =
        (error?.name && error.name === "AbortError") ||
        (typeof error?.message === "string" && error.message.toLowerCase().includes("aborted"));

      if (aborted) {
        setStreamStatus("Stopped by user");
        clearLastSeenIndex();
      } else {
        console.error("Resume error:", error);
        setStreamStatus("Failed to resume. Please restart.");
      }
      setIsStreaming(false);
    }
  };

  const startStreaming = async () => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamedWords([]);
    saveStreamedWords([]);
    setStreamStatus("Connecting...");
    clearLastSeenIndex();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("http://localhost:8080/api/v1/chat/demo-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: MESSAGE,
        }),
        signal: abortController.signal,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Initial stream request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      resetInactivityTimer(resumeStreaming);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsStreaming(false);
          clearInactivityTimer();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const parsed = parseSSELine(line.trim());
          if (parsed?.event) currentEvent = parsed.event;
          else if (parsed?.data && currentEvent) {
            const data: StreamEvent = JSON.parse(parsed.data);

            switch (currentEvent) {
              case "start":
                setStreamStatus(`Started streaming: ${data.chatId}`);
                break;
              case "word":
                if (data.word && typeof data.index === "number") {
                  setStreamedWords((prev) => {
                    const updated = [...prev, data.word!];
                    saveStreamedWords(updated);
                    return updated;
                  });
                  saveLastSeenIndex(data.index);
                  resetInactivityTimer(resumeStreaming);
                }
                break;
              case "complete":
                setStreamStatus(`Completed: ${data.totalWords} words`);
                clearLastSeenIndex();
                clearInactivityTimer();
                setIsStreaming(false);
                return;
            }
            currentEvent = "";
          }
        }
      }
    } catch (error: any) {
      // Detect abort errors reliably across browsers
      const aborted =
        (error?.name && error.name === "AbortError") ||
        (typeof error?.message === "string" && error.message.toLowerCase().includes("aborted"));

      if (aborted) {
        setStreamStatus("Stopped by user");
        clearLastSeenIndex();
      } else {
        console.error("Streaming error:", error);
        setStreamStatus("Connection lost. Attempting to resume...");
        resumeStreaming();
      }
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearInactivityTimer();
    clearLastSeenIndex();
    setIsStreaming(false);
    setStreamStatus("Stopped");
  };

  const clearWords = () => {
    setStreamedWords([]);
    setStreamStatus("");
    clearLastSeenIndex();
    clearStreamedWords();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Add function to fetch chats
  const fetchChats = async () => {
    try {
      const response = await api.get("/api/v1/chat");
      setChats(response as any);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // Refresh chats after creation
  const createChat = async () => {
    if (!chatName) return;
    try {
      const newChat = await api.post("/api/v1/chat", { name: chatName });
      console.log("Chat created:", newChat);
      setChatName("");
      fetchChats();
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  useEffect(() => {
    // Restore previously streamed words (if any) from localStorage
    const savedWords = getStreamedWords();
    if (savedWords.length) {
      setStreamedWords(savedWords);
    }
  }, []);

  // Attempt to resume if we have an unfinished stream
  useEffect(() => {
    const lastIndex = getLastSeenIndex();
    if (lastIndex > 0 && streamedWords.length < lastIndex && !isStreaming) {
      resumeStreaming();
    }
  }, [streamedWords]);

  // Fetch chats when component mounts
  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInactivityTimer();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircleIcon className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isError && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SSE Word Streaming Demo</h1>
        <ModeToggle />
      </div>

      {/* SSE Demo Section */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Server-Sent Events (SSE) Word Streaming</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={startStreaming}
              disabled={isStreaming}
              className="flex items-center gap-2"
            >
              <PlayIcon className="h-4 w-4" />
              Start
            </Button>

            <Button
              onClick={stopStreaming}
              disabled={!isStreaming}
              variant="outline"
              className="flex items-center gap-2"
            >
              <SquareIcon className="h-4 w-4" />
              Stop
            </Button>

            <Button
              onClick={clearWords}
              disabled={isStreaming}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2Icon className="h-4 w-4" />
              Clear
            </Button>
          </div>

          {streamStatus && (
            <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
              Status: {streamStatus}
            </div>
          )}

          <div className="min-h-[200px] p-4 border rounded-md bg-background">
            <div className="flex flex-wrap gap-1">
              {streamedWords.map((word, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary/10 text-primary rounded-sm animate-in fade-in duration-300"
                >
                  {word}
                </span>
              ))}
              {isStreaming && (
                <span className="inline-block w-[2px] bg-primary animate-pulse ml-1 opacity-50" />
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Words received: {streamedWords.length}
            {getLastSeenIndex() > 0 && (
              <span className="ml-4">
                Last seen index: {getLastSeenIndex()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Session Section */}
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

      {/* Chat Management Section */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Chat Management</h2>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Enter chat name"
            className="w-full"
          />
          <Button
            onClick={createChat}
            disabled={!chatName}
            className="flex items-center gap-2"
          >
            Create chat
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
            {JSON.stringify(chats, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}