
"use client";

import type { ChatMessage } from "@/types/chat";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useRef } from "react";
import { Info } from 'lucide-react';

interface ConversationViewProps {
  messages: ChatMessage[];
  isLoading: boolean; 
  aiName?: string;
}

export function ConversationView({ messages, isLoading, aiName = "IA" }: ConversationViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p>Cargando conversación...</p>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Info size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-primary mb-2">Inicia una nueva conversación con {aiName}</h2>
        <p className="text-muted-foreground">¡Pregúntame cualquier cosa o dime en qué necesitas ayuda!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollAreaRef} viewportRef={viewportRef}>
      <div className="space-y-4">
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} aiName={aiName} />
        ))}
      </div>
    </ScrollArea>
  );
}

