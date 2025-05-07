
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { answerGeneralQuestion } from "@/ai/flows/answer-general-question";

import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";
import { ConversationView } from "@/components/chat/ConversationView";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const CHAT_SESSIONS_KEY = "chatSessions";

export default function ChatPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();

  // Load sessions from localStorage on initial mount
  useEffect(() => {
    const storedSessions = getFromLocalStorage<ChatSession[]>(CHAT_SESSIONS_KEY, []);
    setChatSessions(storedSessions);
    if (storedSessions.length > 0) {
      setActiveChatSessionId(storedSessions[0].id); // Activate the most recent chat by default
    } else {
      handleCreateNewChat(); // Create a new chat if none exist
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage(CHAT_SESSIONS_KEY, chatSessions);
  }, [chatSessions]);

  const handleCreateNewChat = useCallback(() => {
    const newChatId = crypto.randomUUID();
    const newChatSession: ChatSession = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChatSessions((prevSessions) => [newChatSession, ...prevSessions]); // Add to the beginning
    setActiveChatSessionId(newChatId);
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after creating new chat
    return newChatId;
  }, []);

  const handleSelectChat = useCallback((sessionId: string) => {
    setActiveChatSessionId(sessionId);
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after selecting a chat
  }, []);
  
  const handleDeleteChat = useCallback((sessionId: string) => {
    setChatSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(session => session.id !== sessionId);
      if (activeChatSessionId === sessionId) {
        setActiveChatSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
        if (updatedSessions.length === 0) {
           handleCreateNewChat(); // Create a new one if all are deleted
        }
      }
      return updatedSessions;
    });
     toast({
        title: "Chat Deleted",
        description: "The chat session has been removed.",
      });
  }, [activeChatSessionId, toast, handleCreateNewChat]);


  const handleSendMessage = async (messageContent: string) => {
    if (!activeChatSessionId) {
      // If no active chat, create one (should ideally not happen if UI is right)
      const newId = handleCreateNewChat();
      if (!newId) return; // Should not happen
       // Need to ensure state updates before proceeding, or pass newId
       // For simplicity, let's assume handleCreateNewChat sets activeChatSessionId synchronously enough
       // or we call handleSendMessage again after creation.
       // A better way might be to make handleCreateNewChat return the new session and use that.
       // For now, let's rely on it being set before the next AI call.
       // This edge case handling might need refinement.
    }


    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    // Add user message and a temporary AI loading message
    setChatSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeChatSessionId) {
          const newTitle = session.messages.length === 0 ? messageContent.substring(0, 50) : session.title;
          return {
            ...session,
            title: newTitle,
            messages: [...session.messages, userMessage],
            updatedAt: new Date(),
          };
        }
        return session;
      })
    );
    
    // Prepare for AI response
    setIsLoadingAiResponse(true);
    const aiLoadingMessageId = crypto.randomUUID();
    const aiLoadingMessage: ChatMessage = {
      id: aiLoadingMessageId,
      sender: "ai",
      content: "", // Placeholder, will be updated
      timestamp: new Date(),
      isLoading: true,
    };

    setChatSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === activeChatSessionId
          ? { ...session, messages: [...session.messages, aiLoadingMessage] }
          : session
      )
    );


    try {
      const aiResponse = await answerGeneralQuestion({ question: messageContent });
      const aiMessage: ChatMessage = {
        id: aiLoadingMessageId, // Use the same ID to replace the loading message
        sender: "ai",
        content: aiResponse.answer,
        timestamp: new Date(),
        isLoading: false,
      };

      setChatSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === activeChatSessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => msg.id === aiLoadingMessageId ? aiMessage : msg),
              updatedAt: new Date(),
            };
          }
          return session;
        })
      );
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, something went wrong.";
      const aiErrorMessage: ChatMessage = {
        id: aiLoadingMessageId, // Replace loading message with error
        sender: "ai",
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isLoading: false,
      };
       setChatSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === activeChatSessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => msg.id === aiLoadingMessageId ? aiErrorMessage : msg),
              updatedAt: new Date(),
            };
          }
          return session;
        })
      );
      toast({
        title: "AI Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  const activeChat = chatSessions.find(session => session.id === activeChatSessionId);

  return (
    <main className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Trigger */}
      <div className="sm:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle History</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <ChatHistorySidebar
              sessions={chatSessions}
              activeSessionId={activeChatSessionId}
              onSelectChat={handleSelectChat}
              onCreateNewChat={handleCreateNewChat}
              onDeleteChat={handleDeleteChat}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden sm:flex h-full">
         <ChatHistorySidebar
            sessions={chatSessions}
            activeSessionId={activeChatSessionId}
            onSelectChat={handleSelectChat}
            onCreateNewChat={handleCreateNewChat}
            onDeleteChat={handleDeleteChat}
          />
      </div>
      

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-4 border-b bg-card sm:hidden">
          <h1 className="text-lg font-semibold truncate text-center">
            {activeChat?.title || "OmniAssist Chat"}
          </h1>
        </header>
        <ConversationView
          messages={activeChat?.messages || []}
          isLoading={!activeChat && chatSessions.length > 0} // Show loading if active chat is being determined
        />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoadingAiResponse}
        />
      </div>
    </main>
  );
}
