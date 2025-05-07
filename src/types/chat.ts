export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string; // Text content
  timestamp: Date;
  isLoading?: boolean; // For AI messages that are being generated
  image?: string; // Data URI for an image
  file?: { // For general file uploads
    name: string;
    type: string;
    dataUri: string; // Data URI for the file content
  };
  extractedCodeBlocks?: Array<{ language: string; code: string }>; // For code snippets
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean; 
}

