
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { answerGeneralQuestion, AnswerGeneralQuestionUserFacingInput } from "@/ai/flows/answer-general-question";

import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";
import { ConversationView } from "@/components/chat/ConversationView";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft, Settings, LogOut, Mic, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NextImage from 'next/image';


const CHAT_SESSIONS_KEY = "chatSessionsOmniAssist"; // Unique key for this app

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
      const latestSession = storedSessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      setActiveChatSessionId(latestSession.id);
    } else {
      handleCreateNewChat();
    }
  }, []); // Added handleCreateNewChat to dependencies

  useEffect(() => {
    saveToLocalStorage(CHAT_SESSIONS_KEY, chatSessions);
  }, [chatSessions]);

  const handleCreateNewChat = useCallback(() => {
    const newChatId = crypto.randomUUID();
    const newChatSession: ChatSession = {
      id: newChatId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
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
        // Try to select the next available session or create a new one
        const newActiveId = updatedSessions.length > 0 
          ? updatedSessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].id 
          : null;
        setActiveChatSessionId(newActiveId);
        if (!newActiveId) {
           handleCreateNewChat(); 
        }
      }
      return updatedSessions;
    });
     toast({
        title: "Chat Deleted",
        description: "The conversation has been removed.",
        variant: "default"
      });
  }, [activeChatSessionId, toast, handleCreateNewChat]);

  const handleTogglePinChat = useCallback((sessionId: string) => {
    setChatSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, isPinned: !session.isPinned, updatedAt: new Date() } : session
      ).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
    );
  }, []);

  const handleRenameChat = useCallback((sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast({ title: "Invalid Title", description: "Chat title cannot be empty.", variant: "destructive" });
      return;
    }
    setChatSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, title: newTitle, updatedAt: new Date() } : session
      )
    );
    toast({ title: "Chat Renamed", description: `Conversation updated to "${newTitle}".`});
  }, [toast]);


  const handleSendMessage = async (
    messageContent: string,
    attachments?: {
      image?: string; // data URI
      file?: { name: string; type: string; dataUri: string };
    }
  ) => {
    let currentChatId = activeChatSessionId;
    if (!currentChatId && chatSessions.length === 0) { // Only create new if no active AND no sessions
      currentChatId = handleCreateNewChat();
    } else if (!currentChatId && chatSessions.length > 0) { // If no active but sessions exist, pick latest
      currentChatId = chatSessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].id;
      setActiveChatSessionId(currentChatId); // Set it as active
    }
    
    if (!currentChatId) return; 

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
          let newTitle = session.title;
          const isDefaultTitle = session.title === "New Conversation" || session.messages.length === 0;
          if (isDefaultTitle) { // Only set title automatically if it's new or untitled
            if (messageContent) {
              newTitle = messageContent.substring(0, 35) + (messageContent.length > 35 ? "..." : "");
            } else if (attachments?.image) {
              newTitle = "Image Analysis";
            } else if (attachments?.file) {
              newTitle = `File: ${attachments.file.name.substring(0,25)}...`;
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
      }).sort((a, b) => { // Re-sort after message to bring updated chat to top (if not pinned)
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

    // Add loading message to the correct session
    setChatSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === currentChatId
          ? { ...session, messages: [...session.messages, aiLoadingMessage] }
          : session
      )
    );

    try {
      const aiInput: AnswerGeneralQuestionUserFacingInput = { // Use the user-facing input type
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
        id: aiLoadingMessageId, // Use the same ID to replace the loading message
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
              messages: session.messages.map(msg => msg.id === aiLoadingMessageId ? aiMessage : msg), // Replace loading with actual
              updatedAt: new Date(),
            };
          }
          return session;
        })
      );
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      const aiErrorMessage: ChatMessage = {
        id: aiLoadingMessageId, // Use same ID
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
              messages: session.messages.map(msg => msg.id === aiLoadingMessageId ? aiErrorMessage : msg), // Replace loading
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
    <div className="flex h-screen antialiased text-foreground bg-background overflow-hidden">
      {/* Mobile Sidebar Trigger */}
      <div className="sm:hidden fixed top-3 left-3 z-50">
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full shadow-md">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle History</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-sidebar text-sidebar-foreground">
            <ChatHistorySidebar
              sessions={chatSessions}
              activeSessionId={activeChatSessionId}
              onSelectChat={handleSelectChat}
              onCreateNewChat={handleCreateNewChat}
              onDeleteChat={handleDeleteChat}
              onTogglePinChat={handleTogglePinChat}
              onRenameChat={handleRenameChat}
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
            onTogglePinChat={handleTogglePinChat}
            onRenameChat={handleRenameChat}
          />
      </div>
      

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Header for main content area */}
        <header className="p-3 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between print:hidden">
          <div className="sm:hidden flex-1"> {/* Placeholder for mobile layout balance or title */}
             <h1 className="text-lg font-semibold truncate text-center">
              {activeChat?.title || "OmniAssist"}
            </h1>
          </div>
          <div className="hidden sm:flex flex-1 items-center"> {/* Desktop title */}
             <h1 className="text-xl font-semibold text-primary pl-3">
              {activeChat?.title || "OmniAssist"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Start Voice Command" className="hover:bg-accent/20">
              <Mic className="h-5 w-5 text-accent" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage asChild src="https://picsum.photos/seed/user1/40/40" data-ai-hint="female user">
                       <NextImage src="https://picsum.photos/seed/user1/40/40" alt="User Avatar" width={40} height={40} />
                    </AvatarImage>
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ConversationView
          messages={activeChat?.messages || []}
          isLoading={!activeChat && chatSessions.length > 0} // Show loading if fetching initial active chat
          chatTitle={activeChat?.title || "Conversation"}
        />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoadingAiResponse}
        />
      </div>
    </div>
  );
}

