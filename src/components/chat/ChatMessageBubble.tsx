
"use client";

import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Loader2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-accent text-accent-foreground">
          {/* <AvatarImage src="/placeholder-ai.jpg" alt="AI Avatar" data-ai-hint="robot avatar" /> */}
          <AvatarFallback>
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-[75%] rounded-xl shadow-md p-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        <CardContent className="p-3">
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
          )}
        </CardContent>
      </Card>
      {isUser && (
        <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
          {/* <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" data-ai-hint="person avatar" /> */}
          <AvatarFallback>
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
