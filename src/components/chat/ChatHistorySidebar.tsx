
"use client";

import type { ChatSession } from "@/types/chat";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Trash2, Pin, PinOff, Edit3, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale for date-fns
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React from "react";


interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onCreateNewChat: () => void;
  onDeleteChat: (sessionId: string) => void;
  onTogglePinChat: (sessionId: string) => void;
  onRenameChat: (sessionId: string, currentTitle: string) => void;
}

export function ChatHistorySidebar({
  sessions,
  activeSessionId,
  onSelectChat,
  onCreateNewChat,
  onDeleteChat,
  onTogglePinChat,
  onRenameChat,
}: ChatHistorySidebarProps) {

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); 
    // Confirmation is handled by AlertDialog, direct call to onDeleteChat happens in AlertDialogAction
  };

  const handleTogglePinClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onTogglePinChat(sessionId);
  };

  const handleRenameClick = (e: React.MouseEvent, sessionId: string, currentTitle: string) => {
    e.stopPropagation();
    onRenameChat(sessionId, currentTitle);
  };


  return (
    <div className="w-full h-full sm:w-72 bg-sidebar text-sidebar-foreground border-r flex flex-col shadow-lg">
      <div className="p-4 border-b flex items-center justify-between space-x-2">
        <Button onClick={onCreateNewChat} className="flex-grow" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Chat
        </Button>
        <ThemeToggle />
      </div>
      <ScrollArea className="flex-1">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>Aún no hay historial de chats.</p>
            <p className="text-sm">¡Comienza un nuevo chat para empezar!</p>
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
                  "w-full justify-start h-auto py-2 px-3 group flex items-center relative text-left cursor-pointer",
                   session.id === activeSessionId && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                )}
                onClick={() => onSelectChat(session.id)}
              >
                {session.isPinned && <Pin className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />}
                {!session.isPinned && <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />}
                
                <div className="flex-1 truncate mr-2">
                  <p className={cn(
                      "truncate", 
                      session.id === activeSessionId ? "font-semibold" : "font-medium"
                    )}
                  >
                    {session.title}
                  </p>
                  <p className={cn(
                    "text-xs",
                    session.id === activeSessionId 
                      ? "text-sidebar-accent-foreground/80" 
                      : "text-muted-foreground group-hover:text-sidebar-accent-foreground/70"
                  )}>
                    {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true, locale: es })}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()} 
                      aria-label="Más opciones"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={(e) => handleTogglePinClick(e, session.id)}>
                      {session.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                      <span>{session.isPinned ? "Desfijar" : "Fijar"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleRenameClick(e, session.id, session.title)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      <span>Renombrar</span>
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive-foreground focus:bg-destructive" 
                          onSelect={(e) => e.preventDefault()} // Prevent DropdownMenu from closing
                          onClick={(e) => handleDeleteClick(e, session.id)} // Keep for potential direct actions if needed
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la sesión de chat: "{session.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(session.id);
                            }}
                            className={buttonVariants({variant: "destructive"})}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>
        )}
      </ScrollArea>
    </div>
  );
}

