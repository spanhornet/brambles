"use client"

// React Hooks
import { useState, useEffect, useRef } from "react";

// UI Components
import { Button } from "@/components/ui/button";

// `ModeToggle` Component
import { ModeToggle } from "@/components/mode-toggle";

// Next.js Hooks
import { useRouter } from "next/navigation";

// React Query Hooks
import { useSession } from "@/lib/hooks/useSession";

// Lucide Icons
import {
  LoaderCircle,
  LogOut,
  Play,
  Square,
  Trash2,
} from "lucide-react";

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

  // State for SSE
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
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

  const startStreaming = async () => {
    // Exit early if already streaming
    if (isStreaming) return;

    // Set initial streaming state
    setIsStreaming(true);
    setStreamedWords([]);
    setStreamStatus("Connecting...");

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('http://localhost:8080/api/v1/chat/demo-chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Hello, world! This is a demonstration of Server-Sent Events streaming words one by one. Each word appears with a slight delay to simulate real-time generation.",
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      // Get a stream reader from the response body
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream is not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsStreaming(false);
          break;
        }

        // Decode and append new data to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split into individual lines and preserve leftover
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Parse Server-Sent Events (SSE) line
          const parsed = parseSSELine(line.trim());

          // Update current event type if available
          if (parsed?.event) {
            currentEvent = parsed.event;
          }
          // Handle data for the current event
          else if (parsed?.data && currentEvent) {
            try {
              const data: StreamEvent = JSON.parse(parsed.data);

              switch (currentEvent) {
                case 'start':
                  // Update status when streaming starts
                  setStreamStatus(`Started streaming: ${data.chatId}`);
                  break;
                case 'word':
                  // Add streamed word to list
                  if (data.word) {
                    setStreamedWords(prev => [...prev, data.word!]);
                  }
                  break;
                case 'complete':
                  // Finish streaming and show total
                  setStreamStatus(`Completed streaming: ${data.totalWords} words`);
                  setIsStreaming(false);
                  return;
              }
            } catch (e) {
              // Handle malformed JSON data
              console.error('Error parsing SSE data:', e);
            }
            currentEvent = '';
          }
        }
      }
    } catch (error: any) {
      // Handle user-initiated abort
      if (error.name === 'AbortError') {
        setStreamStatus("Stopped");
      } else {
        // Handle other errors during streaming
        console.error('Streaming Error:', error);
        setStreamStatus("Connection error occurred");
      }
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus("Stopped");
  };

  const clearWords = () => {
    setStreamedWords([]);
    setStreamStatus("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle className="animate-spin h-8 w-8 text-primary" />
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
              <Play className="h-4 w-4" />
              Start
            </Button>

            <Button
              onClick={stopStreaming}
              disabled={!isStreaming}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>

            <Button
              onClick={clearWords}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
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
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}