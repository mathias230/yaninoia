
"use client";

import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import NextImage from "next/image"; 
import { CodeDisplay } from "./CodeDisplay"; 
import { useState } from "react";
import { ImagePreviewModal } from "./ImagePreviewModal";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  aiName?: string;
}

export function ChatMessageBubble({ message, aiName = "IA" }: ChatMessageBubbleProps) {
  const isUser = message.sender === "user";
  const hasImageAttachment = !!message.image || (message.file && message.file.type.startsWith("image/"));
  const imageDataUri = message.image || (message.file && message.file.type.startsWith("image/") ? message.file.dataUri : undefined);
  const hasGenericFile = message.file && !message.file.type.startsWith("image/");

  const hasCode = message.extractedCodeBlocks && message.extractedCodeBlocks.length > 0;

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const handleImageClick = (url: string) => {
    setPreviewImageUrl(url);
    setIsImagePreviewOpen(true);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4 w-full animate-message-enter", 
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-accent text-accent-foreground flex-shrink-0">
          <AvatarImage asChild src="https://picsum.photos/seed/aiAvatarYanino/32/32" data-ai-hint="robot ai">
            <NextImage src="https://picsum.photos/seed/aiAvatarYanino/32/32" alt={`Avatar de ${aiName}`} width={32} height={32} />
          </AvatarImage>
          <AvatarFallback>
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85%] w-auto")}> 
        <Card
          className={cn(
            "rounded-xl shadow-md p-0",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground",
            "w-auto min-w-[50px]" 
          )}
        >
          <CardContent className="p-3">
            {message.isLoading && !isUser ? (
              <div className="flex items-center gap-2 text-current">
                <div className="animate-typing-dots flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-current"></span>
                  <span className="h-2 w-2 rounded-full bg-current"></span>
                  <span className="h-2 w-2 rounded-full bg-current"></span>
                </div>
                <span>{aiName} está escribiendo</span>
              </div>
            ) : (
              <>
                {imageDataUri && (
                  <button
                    type="button"
                    onClick={() => handleImageClick(imageDataUri)}
                    className="mb-2 rounded-md overflow-hidden max-h-80 block w-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    aria-label={`Abrir vista previa de imagen: ${message.file?.name || "Imagen adjunta"}`}
                  >
                    <NextImage 
                      src={imageDataUri} 
                      alt={message.file?.name || "Imagen adjunta por el usuario"} 
                      width={400} // Increased base width for better display
                      height={300} // Increased base height
                      className="object-contain w-full h-auto max-h-80" 
                      unoptimized={imageDataUri.startsWith('data:image')} 
                      data-ai-hint="attached image"
                    />
                  </button>
                )}
                {hasGenericFile && message.file && (
                  <div className="mb-2 p-2 border rounded-md flex items-center gap-2 bg-background/10 dark:bg-foreground/10">
                    <FileText className="h-6 w-6 text-current/70 flex-shrink-0" />
                    <span className="text-sm truncate" title={message.file.name}>{message.file.name}</span>
                  </div>
                )}
                {message.content && (
                   <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-sm sm:text-base text-current">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({node, ...props}) => null,
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                {!message.content && (imageDataUri || hasGenericFile) && isUser && (
                  <p className="text-sm sm:text-base italic opacity-80">
                    {imageDataUri && <ImageIcon size={14} className="inline mr-1"/>}
                    {hasGenericFile && <FileText size={14} className="inline mr-1"/>}
                    Adjunto enviado
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {hasCode && !message.isLoading && (
           <div className="w-full mt-1"> 
            <CodeDisplay blocks={message.extractedCodeBlocks!} />
           </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground flex-shrink-0">
           <AvatarImage asChild src="https://picsum.photos/seed/userAvatarChat/32/32" data-ai-hint="person user">
            <NextImage src="https://picsum.photos/seed/userAvatarChat/32/32" alt="Avatar de Usuario" width={32} height={32} />
          </AvatarImage>
          <AvatarFallback>
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      {previewImageUrl && (
        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          onClose={() => {
            setIsImagePreviewOpen(false);
            setPreviewImageUrl(null);
          }}
          imageUrl={previewImageUrl}
          altText={message.file?.name || (isUser ? "Imagen subida por el usuario" : `Imagen de ${aiName}`)}
        />
      )}
    </div>
  );
}

