
"use client";

import type { ChatSession } from "@/types/chat";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { ThemeToggle } from "@/components/ThemeToggle";


interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onCreateNewChat: () => void;
  onDeleteChat: (sessionId: string) => void;
}

export function ChatHistorySidebar({
  sessions,
  activeSessionId,
  onSelectChat,
  onCreateNewChat,
  onDeleteChat,
}: ChatHistorySidebarProps) {

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    if (window.confirm("Are you sure you want to delete this chat session?")) {
      onDeleteChat(sessionId);
    }
  };

  return (
    <div className="w-full h-full sm:w-72 bg-card text-card-foreground border-r flex flex-col shadow-lg">
      <div className="p-4 border-b flex items-center justify-between space-x-2">
        <Button onClick={onCreateNewChat} className="flex-grow" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> New Chat
        </Button>
        <ThemeToggle />
      </div>
      <ScrollArea className="flex-1">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No chat history yet.</p>
            <p className="text-sm">Start a new chat to begin!</p>
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                aria-pressed={session.id === activeSessionId}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChat(session.id);
                  }
                }}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "default" }),
                  "w-full justify-start h-auto py-2 px-3 group flex items-center relative",
                   session.id === activeSessionId && "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
                onClick={() => onSelectChat(session.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                <div className="flex-1 truncate text-left mr-2">
                  <p className="font-medium truncate">{session.title}</p>
                  <p className={cn(
                    "text-xs",
                    session.id === activeSessionId 
                      ? "text-accent-foreground/80" 
                      : "text-muted-foreground group-hover:text-accent-foreground/70"
                  )}>
                    {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, session.id)}
                  aria-label="Delete chat"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </nav>
        )}
      </ScrollArea>
    </div>
  );
}
