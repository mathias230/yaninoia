
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
          title: "File too large",
          description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
        });
        event.target.value = ""; // Reset input
        return;
      }
      if (type === "image") {
        setSelectedImage(file);
        setSelectedFile(null); // Can only have one or the other for simplicity in this UI
         toast({ title: "Image Selected", description: file.name });
      } else {
        setSelectedFile(file);
        setSelectedImage(null);
        toast({ title: "File Selected", description: file.name });
      }
    }
     // Reset file input to allow selecting the same file again
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

      // Ensure onSendMessage is called with a structure it expects
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
      console.error("Error processing file for sending:", error);
      toast({
        variant: "destructive",
        title: "File Error",
        description: "Could not read or process the selected file.",
      });
    }
  };
  
  const handlePhotoCaptured = async (dataUri: string) => {
    // To treat captured photo as an image attachment
    onSendMessage(inputValue.trim(), { image: dataUri });
    setInputValue(""); // Clear input after sending
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
          <Button variant="ghost" size="icon" onClick={() => setIsPhotoModalOpen(true)} disabled={isLoading} aria-label="Take a photo">
            <CameraIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={triggerImageInput} disabled={isLoading} aria-label="Upload image">
            <ImagePlus className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => handleFileChange(e, "image")}
            className="hidden"
          />
          <Button variant="ghost" size="icon" onClick={triggerFileInput} disabled={isLoading} aria-label="Upload file">
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
              selectedImage ? `Describe the image "${selectedImage.name}" or ask a question...` :
              selectedFile ? `Ask about the file "${selectedFile.name}"...` :
              "Type your message or upload a file..."
            }
            className="flex-1 resize-none min-h-[40px] max-h-[200px] text-base"
            rows={1}
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <Button onClick={handleSubmit} disabled={isLoading || (!inputValue.trim() && !selectedImage && !selectedFile)} className="h-[40px] self-end" aria-label="Send message">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {(selectedImage || selectedFile) && (
          <div className="mt-2 text-sm text-muted-foreground">
            Attached: {selectedImage?.name || selectedFile?.name}
            <Button variant="ghost" size="sm" onClick={() => {setSelectedImage(null); setSelectedFile(null);}} className="ml-2 h-auto p-1 text-xs">Clear</Button>
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
