
"use client";

import { useState, type KeyboardEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip, ImagePlus, Camera as CameraIcon } from "lucide-react";
import { readFileAsDataURL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/types/chat";
import { PhotoCaptureModal } from "./PhotoCaptureModal";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ChatInputProps {
  onSendMessage: (
    message: string,
    attachments?: {
      image?: string; // data URI
      file?: { name: string; type: string; dataUri: string };
    }
  ) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "file"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "Archivo demasiado grande",
          description: `Por favor, selecciona un archivo menor de ${MAX_FILE_SIZE_MB}MB.`,
        });
        event.target.value = ""; 
        return;
      }
      if (type === "image") {
        setSelectedImage(file);
        setSelectedFile(null); 
         toast({ title: "Imagen Seleccionada", description: file.name });
      } else {
        setSelectedFile(file);
        setSelectedImage(null);
        toast({ title: "Archivo Seleccionado", description: file.name });
      }
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    const textContent = inputValue.trim();
    if ((!textContent && !selectedImage && !selectedFile) || isLoading) {
      return;
    }

    let attachments: ChatMessage["file"] | { image?: string } | undefined;

    try {
      if (selectedImage) {
        const dataUri = await readFileAsDataURL(selectedImage);
        attachments = { image: dataUri };
      } else if (selectedFile) {
        const dataUri = await readFileAsDataURL(selectedFile);
        attachments = {
          file: { name: selectedFile.name, type: selectedFile.type, dataUri },
        };
      }

      if (attachments && 'image' in attachments) {
         onSendMessage(textContent, { image: attachments.image });
      } else if (attachments && 'file' in attachments) {
         onSendMessage(textContent, { file: attachments.file });
      } else {
        onSendMessage(textContent);
      }

      setInputValue("");
      setSelectedImage(null);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error al procesar el archivo para enviar:", error);
      toast({
        variant: "destructive",
        title: "Error de Archivo",
        description: "No se pudo leer o procesar el archivo seleccionado.",
      });
    }
  };
  
  const handlePhotoCaptured = async (dataUri: string) => {
    onSendMessage(inputValue.trim(), { image: dataUri });
    setInputValue(""); 
    setIsPhotoModalOpen(false);
  };


  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };
  
  const triggerImageInput = () => imageInputRef.current?.click();
  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <>
      <div className="p-4 sm:p-6 border-t bg-background">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsPhotoModalOpen(true)} disabled={isLoading} aria-label="Tomar una foto">
            <CameraIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={triggerImageInput} disabled={isLoading} aria-label="Subir imagen">
            <ImagePlus className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => handleFileChange(e, "image")}
            className="hidden"
          />
          <Button variant="ghost" size="icon" onClick={triggerFileInput} disabled={isLoading} aria-label="Subir archivo">
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e, "file")}
            className="hidden"
          />

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedImage ? `Describe la imagen "${selectedImage.name}" o haz una pregunta...` :
              selectedFile ? `Pregunta sobre el archivo "${selectedFile.name}"...` :
              "Escribe tu mensaje o sube un archivo..."
            }
            className="flex-1 resize-none min-h-[40px] max-h-[200px] text-base"
            rows={1}
            disabled={isLoading}
            aria-label="Entrada de mensaje de chat"
          />
          <Button onClick={handleSubmit} disabled={isLoading || (!inputValue.trim() && !selectedImage && !selectedFile)} className="h-[40px] self-end" aria-label="Enviar mensaje">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {(selectedImage || selectedFile) && (
          <div className="mt-2 text-sm text-muted-foreground">
            Adjunto: {selectedImage?.name || selectedFile?.name}
            <Button variant="ghost" size="sm" onClick={() => {setSelectedImage(null); setSelectedFile(null);}} className="ml-2 h-auto p-1 text-xs">Quitar</Button>
          </div>
        )}
      </div>
      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoCapture={handlePhotoCaptured}
      />
    </>
  );
}

