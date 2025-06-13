"use client"

// Utilities
import { api } from "@/lib/api-handler";
import { cn } from "@/lib/clsx-handler";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle";

// React Hooks
import { useState, useEffect, useRef, useId } from "react";

// Next.js Hooks
import { useRouter } from "next/navigation";

// React Query Hooks
import { useSession } from "@/lib/hooks/useSession";

// Lucide Icons
import {
  LoaderCircleIcon,
  LogOutIcon,
  SquareIcon,
  Trash2Icon,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";

interface Chat {
  ID: string;
  UserID: string;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string;
  Name: string;
  Messages: Message[];
}

interface Message {
  ID: string;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string;
  ChatID: string;
  Model: string;
  Role: string;
  Content: string;
}

interface Stream {
  word?: string;
  index?: number;
  chatId?: string;
  status?: string;
  totalWords?: number;
}

export default function Home() {
  // Set router
  const router = useRouter();

  // Set state for streaming
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

  // Add state for chat name
  const [chatName, setChatName] = useState("");

  // Add state for chats
  const [chats, setChats] = useState<any[]>([]);

  // Add state for selected chat
  const [selectedChat, setSelectedChat] = useState<string>("");

  // Add state for chat message
  const [message, setMessage] = useState("");

  // Add state to store the current streaming message
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");

  // State for chat select
  const chatSelectId = useId();
  const [chatSelectOpen, setChatSelectOpen] = useState<boolean>(false);

  // Helper to save last seen index
  const saveLastSeenIndex = (index: number) => {
    localStorage.setItem("lastSeenIndex", index.toString());
  };

  // Helper to get last seen index
  const getLastSeenIndex = () => {
    return parseInt(localStorage.getItem("lastSeenIndex") || "0", 10);
  };

  // Helper to clear last seen index
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

  // Helper to save current streaming message
  const saveCurrentStreamingMessage = (message: string) => {
    localStorage.setItem("currentStreamingMessage", message);
  };

  // Helper to get current streaming message
  const getCurrentStreamingMessage = (): string => {
    return localStorage.getItem("currentStreamingMessage") || "";
  };

  // Helper to clear current streaming message
  const clearCurrentStreamingMessage = () => {
    localStorage.removeItem("currentStreamingMessage");
  };

  // Helper to save selected chat
  const saveSelectedChat = (chatId: string) => {
    localStorage.setItem("selectedChat", chatId);
  };

  // Helper to get selected chat
  const getSavedSelectedChat = (): string => {
    return localStorage.getItem("selectedChat") || "";
  };

  // Helper to clear selected chat
  const clearSelectedChat = () => {
    localStorage.removeItem("selectedChat");
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
    const savedChat = selectedChat || getSavedSelectedChat();
    const savedMessage = currentStreamingMessage || getCurrentStreamingMessage();

    if (!savedChat || !savedMessage) {
      setStreamStatus("No chat selected or message to resume");
      return;
    }

    // Restore state if needed
    if (!selectedChat && savedChat) {
      setSelectedChat(savedChat);
    }
    if (!currentStreamingMessage && savedMessage) {
      setCurrentStreamingMessage(savedMessage);
    }

    const lastIndex = getLastSeenIndex();
    setStreamStatus(`Reconnecting from word ${lastIndex}...`);
    setIsStreaming(true);

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/chat/${savedChat}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSeenIndex: lastIndex,
          message: savedMessage
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
            const data: Stream = JSON.parse(parsed.data);

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
                clearCurrentStreamingMessage();
                clearInactivityTimer();
                setIsStreaming(false);
                fetchChats(); // Refetch chats after streaming is complete
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
        clearCurrentStreamingMessage();
      } else {
        console.error("Resume error:", error);
        setStreamStatus("Failed to resume. Please restart.");
        // Don't clear persistence on resume error - keep trying to resume
      }
      setIsStreaming(false);
    }
  };

  const startStreaming = async (messageToStream: string) => {
    if (isStreaming) return;
    if (!selectedChat) {
      setStreamStatus("Please select a chat first");
      return;
    }
    if (!messageToStream.trim()) {
      setStreamStatus("Please enter a message");
      return;
    }

    setIsStreaming(true);
    setStreamedWords([]);
    saveStreamedWords([]);
    setStreamStatus("Connecting...");
    clearLastSeenIndex();
    setCurrentStreamingMessage(messageToStream);
    saveCurrentStreamingMessage(messageToStream);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/chat/${selectedChat}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToStream,
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
            const data: Stream = JSON.parse(parsed.data);

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
                clearCurrentStreamingMessage();
                clearInactivityTimer();
                setIsStreaming(false);
                fetchChats(); // Refetch chats after streaming is complete
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
        clearCurrentStreamingMessage();
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
    clearCurrentStreamingMessage();
    setIsStreaming(false);
    setStreamStatus("Stopped");
  };

  const clearWords = () => {
    setStreamedWords([]);
    setStreamStatus("");
    clearLastSeenIndex();
    clearStreamedWords();
    clearCurrentStreamingMessage();
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

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;
    startStreaming(message);
    setMessage("");
  };

  useEffect(() => {
    // Restore previously streamed words (if any) from localStorage
    const savedWords = getStreamedWords();
    if (savedWords.length) {
      setStreamedWords(savedWords);
    }

    // Restore selected chat
    const savedChat = getSavedSelectedChat();
    if (savedChat) {
      setSelectedChat(savedChat);
    }

    // Restore current streaming message
    const savedMessage = getCurrentStreamingMessage();
    if (savedMessage) {
      setCurrentStreamingMessage(savedMessage);
    }
  }, []);

  // Attempt to resume if we have an unfinished stream
  useEffect(() => {
    const lastIndex = getLastSeenIndex();
    const savedChat = selectedChat || getSavedSelectedChat();
    const savedMessage = currentStreamingMessage || getCurrentStreamingMessage();

    if (lastIndex > 0 && !isStreaming && savedChat && savedMessage) {
      console.log("Attempting to resume streaming...", { lastIndex, savedChat, savedMessage });
      resumeStreaming();
    }
  }, [streamedWords, selectedChat, currentStreamingMessage, isStreaming]);

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
        <h1 className="text-xl font-medium">Brambles</h1>
        <ModeToggle />
      </div>

      {/* Combined Chat and Streaming Section */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Message Relay with Streaming</h2>

        {/* Chat Creation */}
        <div className="flex items-center space-x-2 mb-4">
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

        {/* Chat Selection */}
        <div className="mb-4">
          <div className="*:not-first:mt-2">
            <Popover open={chatSelectOpen} onOpenChange={setChatSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={chatSelectId}
                  variant="outline"
                  role="combobox"
                  aria-expanded={chatSelectOpen}
                  className="bg-background hover:bg-background text-foreground border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]"
                >
                  <span className={cn("truncate", !selectedChat && "text-muted-foreground")}>
                    {selectedChat
                      ? chats.find((chat) => chat.ID === selectedChat)?.Name
                      : "Select chat"}
                  </span>
                  <ChevronDownIcon
                    size={16}
                    className="text-muted-foreground/80 shrink-0"
                    aria-hidden="true"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="border-input w-full min-w-[var(--radix-popover-anchor-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search chats..." />
                  <CommandList>
                    <CommandEmpty>No chats found.</CommandEmpty>
                    <CommandGroup>
                      {chats.map((chat, index) => (
                        <CommandItem
                          key={index}
                          value={chat.ID}
                          onSelect={(currentValue) => {
                            const newValue = currentValue === selectedChat ? "" : currentValue;
                            setSelectedChat(newValue);
                            if (newValue) {
                              saveSelectedChat(newValue);
                            } else {
                              clearSelectedChat();
                            }
                            setChatSelectOpen(false);
                          }}
                        >
                          {chat.Name}
                          <span className="text-xs text-muted-foreground">
                            {chat.ID}
                          </span>
                          {selectedChat === chat.ID && (
                            <CheckIcon size={16} className="ml-auto" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Streaming Controls */}
        <div className="space-y-4">
          <div className="flex gap-2">
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

        {/* Message Input */}
        <div className="mt-4">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={!selectedChat || isStreaming}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || !selectedChat || isStreaming}
              className="shrink-0"
            >
              Send message
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium">Available Chats:</div>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-32">
            {JSON.stringify(chats, null, 2)}
          </pre>
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
    </div>
  );
}