
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { answerGeneralQuestion, AnswerGeneralQuestionUserFacingInput } from "@/ai/flows/answer-general-question";
import { generateChatTitle } from "@/ai/flows/generate-chat-title-flow";
import { extractAllCodeBlocks } from "@/lib/utils";

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
import { Input } from "@/components/ui/input"; 
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"; 


const CHAT_SESSIONS_KEY = "chatSessionsYanino"; 
const DEFAULT_CHAT_TITLE = "Nuevo Chat con Yanino";

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
      title: DEFAULT_CHAT_TITLE,
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
        title: "Chat Eliminado",
        description: "La conversación ha sido eliminada.",
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
        title: session.isPinned ? "Chat Desfijado" : "Chat Fijado",
        description: `La conversación "${session.title}" ha sido ${session.isPinned ? 'desfijada.' : 'fijada.'}`
      });
    }
  }, [chatSessions, toast]);

  const startRenameChat = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setRenameInput(currentTitle);
  };

  const confirmRenameChat = () => {
    if (!editingSessionId || !renameInput.trim()) {
      toast({ title: "Título Inválido", description: "El título del chat no puede estar vacío.", variant: "destructive" });
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
    toast({ title: "Chat Renombrado", description: `La conversación ha sido actualizada a "${renameInput.trim()}".`});
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
        // After creating a new chat, find its index again as the array has changed.
        currentSessionIndex = chatSessions.findIndex(session => session.id === currentChatId);
         // Fallback logic in case chatSessions hasn't updated immediately (should not be an issue with sync handleCreateNewChat)
        if (currentSessionIndex === -1) {
           const newSessionJustAdded = chatSessions.find(s => s.id === currentChatId);
           if (newSessionJustAdded) {
             currentSessionIndex = chatSessions.indexOf(newSessionJustAdded);
           } else { // Extremely unlikely, but a safeguard.
             console.error("Failed to find newly created chat session index immediately.");
             return;
           }
        }
    }
    
    if (!currentChatId || currentSessionIndex === -1) {
      console.error("No active or valid chat session ID found for sending message.");
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      content: messageContent,
      timestamp: new Date(),
      image: attachments?.image,
      file: attachments?.file,
    };
    
    const sessionBeforeUserMessage = chatSessions[currentSessionIndex];
    const isFirstUserMessageInSession = sessionBeforeUserMessage?.messages.filter(m => m.sender === 'user' && !m.isLoading).length === 0;

    setChatSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === currentChatId) {
          return {
            ...session,
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
    
    const conversationHistoryForAI = (sessionBeforeUserMessage?.messages || [])
      .filter(msg => !msg.isLoading && (msg.content || msg.image || msg.file)) 
      .map(msg => ({
        sender: msg.sender,
        content: msg.content || (msg.image ? "[Usuario envió una imagen]" : msg.file ? `[Usuario envió un archivo: ${msg.file.name}]` : "[Mensaje vacío]")
      }));

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

      if (isFirstUserMessageInSession && sessionBeforeUserMessage?.title === DEFAULT_CHAT_TITLE && currentChatId) {
        try {
          const titleUserMessageContent = userMessage.content || 
                                          (userMessage.image ? "Análisis de imagen" : 
                                          (userMessage.file ? `Consulta sobre archivo: ${userMessage.file.name}` : "Conversación iniciada"));
          const titleResponse = await generateChatTitle({
            userMessage: titleUserMessageContent,
            aiMessage: aiMessage.content,
          });
          if (titleResponse.title) {
            setChatSessions((prevSessions) =>
              prevSessions.map((session) =>
                session.id === currentChatId
                  ? { ...session, title: titleResponse.title, updatedAt: new Date() }
                  : session
              ).sort((a, b) => { 
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              })
            );
          }
        } catch (titleError) {
          console.warn("Error al generar el título del chat:", titleError);
        }
      }

    } catch (error) {
      console.error("Error al obtener respuesta de la IA:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
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
        title: "Error de IA",
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
              <span className="sr-only">Alternar Historial</span>
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
              {activeChat?.title || "Yanino"}
            </h1>
          </div>
          <div className="hidden sm:flex flex-1 items-center"> 
             <h1 className="text-xl font-semibold text-primary pl-3">
              {activeChat?.title || "Yanino"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Iniciar Comando de Voz" className="hover:bg-accent/20">
              <Mic className="h-5 w-5 text-accent" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage asChild src="https://picsum.photos/seed/userProfile/40/40" data-ai-hint="female user">
                       <NextImage src="https://picsum.photos/seed/userProfile/40/40" alt="Avatar de Usuario" width={40} height={40} />
                    </AvatarImage>
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Soporte</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ConversationView
          messages={activeChat?.messages || []}
          isLoading={!activeChat && chatSessions.length === 0}
          aiName="Yanino"
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
              <DialogTitle>Renombrar Chat</DialogTitle>
              <DialogDescription>
                Ingresa un nuevo título para esta conversación.
              </DialogDescription>
            </DialogHeader>
            <Input 
              value={renameInput} 
              onChange={(e) => setRenameInput(e.target.value)} 
              placeholder="Ingresa el nuevo título del chat"
              onKeyDown={(e) => e.key === 'Enter' && confirmRenameChat()}
              className="my-4"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={cancelRenameChat}>Cancelar</Button>
              </DialogClose>
              <Button onClick={confirmRenameChat}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
