
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { answerGeneralQuestion, AnswerGeneralQuestionInput } from "@/ai/flows/answer-general-question";

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

  useEffect(() => {
    const storedSessions = getFromLocalStorage<ChatSession[]>(CHAT_SESSIONS_KEY, []);
    setChatSessions(storedSessions);
    if (storedSessions.length > 0) {
      setActiveChatSessionId(storedSessions[0].id);
    } else {
      handleCreateNewChat();
    }
  }, []);

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
    setChatSessions((prevSessions) => [newChatSession, ...prevSessions]);
    setActiveChatSessionId(newChatId);
    setIsMobileSidebarOpen(false);
    return newChatId;
  }, []);

  const handleSelectChat = useCallback((sessionId: string) => {
    setActiveChatSessionId(sessionId);
    setIsMobileSidebarOpen(false);
  }, []);
  
  const handleDeleteChat = useCallback((sessionId: string) => {
    setChatSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(session => session.id !== sessionId);
      if (activeChatSessionId === sessionId) {
        const newActiveId = updatedSessions.length > 0 ? updatedSessions[0].id : null;
        setActiveChatSessionId(newActiveId);
        if (!newActiveId) {
           handleCreateNewChat(); 
        }
      }
      return updatedSessions;
    });
     toast({
        title: "Chat Deleted",
        description: "The chat session has been removed.",
      });
  }, [activeChatSessionId, toast, handleCreateNewChat]);


  const handleSendMessage = async (
    messageContent: string,
    attachments?: {
      image?: string; // data URI
      file?: { name: string; type: string; dataUri: string };
    }
  ) => {
    let currentChatId = activeChatSessionId;
    if (!currentChatId) {
      currentChatId = handleCreateNewChat();
      // Need to ensure state updates if we want to use activeChatSessionId immediately.
      // For robustness, use the returned ID from handleCreateNewChat.
    }
    if (!currentChatId) return; // Should not happen


    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      content: messageContent,
      timestamp: new Date(),
      image: attachments?.image,
      file: attachments?.file,
    };

    setChatSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === currentChatId) {
          // Set title from first text message, or based on attachment type if no text
          let newTitle = session.title;
          if (session.messages.length === 0) {
            if (messageContent) {
              newTitle = messageContent.substring(0, 30) + (messageContent.length > 30 ? "..." : "");
            } else if (attachments?.image) {
              newTitle = "Image analysis";
            } else if (attachments?.file) {
              newTitle = `File: ${attachments.file.name.substring(0,20)}...`;
            } else {
              newTitle = "New Chat";
            }
          }
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
    
    setIsLoadingAiResponse(true);
    const aiLoadingMessageId = crypto.randomUUID();
    const aiLoadingMessage: ChatMessage = {
      id: aiLoadingMessageId,
      sender: "ai",
      content: "", 
      timestamp: new Date(),
      isLoading: true,
    };

    setChatSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === currentChatId
          ? { ...session, messages: [...session.messages, aiLoadingMessage] }
          : session
      )
    );

    try {
      const aiInput: AnswerGeneralQuestionInput = {
        question: messageContent,
      };
      if (attachments?.image) {
        aiInput.imageDataUri = attachments.image;
      }
      if (attachments?.file) {
        aiInput.fileData = attachments.file;
      }

      const aiResponse = await answerGeneralQuestion(aiInput);
      const aiMessage: ChatMessage = {
        id: aiLoadingMessageId,
        sender: "ai",
        content: aiResponse.answer,
        timestamp: new Date(),
        isLoading: false,
      };

      setChatSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === currentChatId) {
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
        id: aiLoadingMessageId,
        sender: "ai",
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isLoading: false,
      };
       setChatSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === currentChatId) {
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
          isLoading={!activeChat && chatSessions.length > 0}
        />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoadingAiResponse}
        />
      </div>
    </main>
  );
}
