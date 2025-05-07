"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { answerGeneralQuestion, AnswerGeneralQuestionUserFacingInput } from "@/ai/flows/answer-general-question";
import { extractAllCodeBlocks } from "@/lib/utils";

import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";
import { ConversationView } from "@/components/chat/ConversationView";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft, Settings, LogOut, Mic, HelpCircle, Edit3 } from "lucide-react";
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
import { Input } from "@/components/ui/input"; // For rename input
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // For rename dialog


const CHAT_SESSIONS_KEY = "chatSessionsOmniAssist"; 

export default function ChatPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    const storedSessions = getFromLocalStorage<ChatSession[]>(CHAT_SESSIONS_KEY, []);
    setChatSessions(storedSessions.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }));
    if (storedSessions.length > 0) {
      const latestSession = storedSessions.sort((a,b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })[0];
      setActiveChatSessionId(latestSession.id);
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
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
    };
    setChatSessions((prevSessions) => [newChatSession, ...prevSessions].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }));
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
        const newActiveId = updatedSessions.length > 0 
          ? updatedSessions.sort((a,b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })[0].id 
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
     const session = chatSessions.find(s => s.id === sessionId);
     if (session) {
      toast({
        title: session.isPinned ? "Chat Unpinned" : "Chat Pinned",
        description: `Conversation "${session.title}" ${session.isPinned ? 'unpinned.' : 'pinned.'}`
      });
    }
  }, [chatSessions, toast]);

  const startRenameChat = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setRenameInput(currentTitle);
  };

  const confirmRenameChat = () => {
    if (!editingSessionId || !renameInput.trim()) {
      toast({ title: "Invalid Title", description: "Chat title cannot be empty.", variant: "destructive" });
      if(!renameInput.trim() && editingSessionId){
        const originalSession = chatSessions.find(s => s.id === editingSessionId);
        if(originalSession) setRenameInput(originalSession.title);
      }
      return;
    }
    setChatSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === editingSessionId ? { ...session, title: renameInput.trim(), updatedAt: new Date() } : session
      ).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
    );
    toast({ title: "Chat Renamed", description: `Conversation updated to "${renameInput.trim()}".`});
    setEditingSessionId(null);
    setRenameInput("");
  };

  const cancelRenameChat = () => {
    setEditingSessionId(null);
    setRenameInput("");
  };


  const handleSendMessage = async (
    messageContent: string,
    attachments?: {
      image?: string; 
      file?: { name: string; type: string; dataUri: string };
    }
  ) => {
    let currentChatId = activeChatSessionId;
    let currentSessionIndex = chatSessions.findIndex(session => session.id === currentChatId);

    if (currentChatId === null || currentSessionIndex === -1) {
        currentChatId = handleCreateNewChat();
        currentSessionIndex = 0; // New chat is at the top
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

    const currentChatMessages = chatSessions[currentSessionIndex]?.messages || [];
    const conversationHistoryForAI = currentChatMessages
      .filter(msg => !msg.isLoading && (msg.content || msg.image || msg.file)) 
      .map(msg => ({
        sender: msg.sender,
        content: msg.content || (msg.image ? "[User sent an image]" : msg.file ? `[User sent a file: ${msg.file.name}]` : "[Empty message]")
      }));


    setChatSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === currentChatId) {
          let newTitle = session.title;
          const isDefaultTitle = session.title === "New Conversation" || session.messages.length === 0;
          if (isDefaultTitle && session.messages.filter(m => !m.isLoading).length === 0) { 
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
      }).sort((a, b) => { 
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

    setChatSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === currentChatId
          ? { ...session, messages: [...session.messages, aiLoadingMessage] }
          : session
      )
    );

    try {
      const aiInput: AnswerGeneralQuestionUserFacingInput = { 
        question: messageContent,
        conversationHistory: conversationHistoryForAI,
      };
      if (attachments?.image) {
        aiInput.imageDataUri = attachments.image;
      }
      if (attachments?.file) {
        aiInput.fileData = attachments.file;
      }

      const aiResponse = await answerGeneralQuestion(aiInput);
      const extractedCodeBlocks = extractAllCodeBlocks(aiResponse.answer);

      const aiMessage: ChatMessage = {
        id: aiLoadingMessageId, 
        sender: "ai",
        content: aiResponse.answer,
        timestamp: new Date(),
        isLoading: false,
        extractedCodeBlocks: extractedCodeBlocks.length > 0 ? extractedCodeBlocks : undefined,
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
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
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
    <main className="flex h-screen antialiased text-foreground bg-background overflow-hidden">
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
              onRenameChat={startRenameChat}
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
            onTogglePinChat={handleTogglePinChat}
            onRenameChat={startRenameChat}
          />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-3 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between print:hidden">
          <div className="sm:hidden flex-1"> 
             <h1 className="text-lg font-semibold truncate text-center">
              {activeChat?.title || "OmniAssist"}
            </h1>
          </div>
          <div className="hidden sm:flex flex-1 items-center"> 
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
                    <AvatarImage asChild src="https://picsum.photos/seed/userProfile/40/40" data-ai-hint="female user">
                       <NextImage src="https://picsum.photos/seed/userProfile/40/40" alt="User Avatar" width={40} height={40} />
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
          isLoading={!activeChat && chatSessions.length > 0}
        />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoadingAiResponse}
        />
      </div>

      {editingSessionId && (
        <Dialog open={!!editingSessionId} onOpenChange={(isOpen) => !isOpen && cancelRenameChat()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Chat</DialogTitle>
              <DialogDescription>
                Enter a new title for this conversation.
              </DialogDescription>
            </DialogHeader>
            <Input 
              value={renameInput} 
              onChange={(e) => setRenameInput(e.target.value)} 
              placeholder="Enter new chat title"
              onKeyDown={(e) => e.key === 'Enter' && confirmRenameChat()}
              className="my-4"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={cancelRenameChat}>Cancel</Button>
              </DialogClose>
              <Button onClick={confirmRenameChat}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
