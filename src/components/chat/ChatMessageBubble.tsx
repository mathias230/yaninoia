"use client";

import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Loader2, User, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import NextImage from "next/image"; // Renamed to avoid conflict
import { CodeDisplay } from "./CodeDisplay"; // Import CodeDisplay

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender === "user";
  const hasImage = !!message.image || (message.file && message.file.type.startsWith("image/"));
  const imageData = message.image || (message.file && message.file.type.startsWith("image/") ? message.file.dataUri : undefined);
  const hasGenericFile = message.file && !message.file.type.startsWith("image/");

  const hasCode = message.extractedCodeBlocks && message.extractedCodeBlocks.length > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4 w-full", // Ensure bubble can take full width for CodeDisplay
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-accent text-accent-foreground flex-shrink-0">
          <AvatarImage asChild src="https://picsum.photos/32/32?random=1" data-ai-hint="robot ai">
            <NextImage src="https://picsum.photos/32/32?random=1" alt="AI Avatar" width={32} height={32} />
          </AvatarImage>
          <AvatarFallback>
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85%] w-auto")}> {/* Adjust width for content + code */}
        <Card
          className={cn(
            "rounded-xl shadow-md p-0",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground",
            "w-auto min-w-[50px]" // Ensure card has some minimum width
          )}
        >
          <CardContent className="p-3">
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              <>
                {imageData && (
                  <div className="mb-2 rounded-md overflow-hidden max-h-80">
                    <NextImage 
                      src={imageData} 
                      alt={message.file?.name || "User uploaded image"} 
                      width={300} 
                      height={200} 
                      className="object-contain w-full h-auto max-h-80" 
                      unoptimized={imageData.startsWith('data:image')} 
                      data-ai-hint="attached image"
                    />
                  </div>
                )}
                {hasGenericFile && message.file && (
                  <div className="mb-2 p-2 border rounded-md flex items-center gap-2 bg-background/10 dark:bg-foreground/10">
                    <FileText className="h-6 w-6 text-current/70 flex-shrink-0" />
                    <span className="text-sm truncate" title={message.file.name}>{message.file.name}</span>
                  </div>
                )}
                {/* Render message content only if it's not entirely captured by code blocks or if there's no code */}
                {message.content && (!hasCode || (hasCode && !message.extractedCodeBlocks?.every(block => message.content.includes(`\`\`\`${block.language || ''}\n${block.code}\n\`\`\``)))) && (
                   <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                )}
                {!message.content && (imageData || hasGenericFile) && isUser && (
                  <p className="whitespace-pre-wrap text-sm sm:text-base italic opacity-80">
                    {imageData && <ImageIcon size={14} className="inline mr-1"/>}
                    {hasGenericFile && <FileText size={14} className="inline mr-1"/>}
                    Sent attachment
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {hasCode && !message.isLoading && (
           <div className="w-full mt-1"> {/* Ensure CodeDisplay takes appropriate width */}
            <CodeDisplay blocks={message.extractedCodeBlocks!} />
           </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground flex-shrink-0">
           <AvatarImage asChild src="https://picsum.photos/32/32?random=2" data-ai-hint="person user">
            <NextImage src="https://picsum.photos/32/32?random=2" alt="User Avatar" width={32} height={32} />
          </AvatarImage>
          <AvatarFallback>
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
