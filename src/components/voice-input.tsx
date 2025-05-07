"use client";

import type * as React from "react";
import { Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onSubmitCommand: (command: string) => void;
  isLoading: boolean;
  currentStatus: string;
}

export function VoiceInput({
  isRecording,
  onToggleRecording,
  transcript,
  onTranscriptChange,
  onSubmitCommand,
  isLoading,
  currentStatus,
}: VoiceInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && transcript.trim() && !isLoading && !isRecording) {
      onSubmitCommand(transcript);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-lg shadow-md w-full bg-card">
      <Button
        onClick={onToggleRecording}
        size="lg" 
        variant="default"
        className={cn(
          "w-20 h-20 rounded-full text-accent-foreground transition-all duration-300 ease-in-out shadow-lg",
          isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-accent hover:bg-accent/90",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        disabled={isLoading}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <Mic size={36} />
      </Button>
      <p className="text-sm text-muted-foreground h-5">
        {currentStatus}
      </p>
      <div className="flex w-full gap-2 items-center">
        <Input
          type="text"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Or type your command here..."
          className="flex-grow text-base"
          disabled={isLoading || isRecording}
          onKeyDown={handleKeyDown}
          aria-label="Type your command"
        />
        <Button
          onClick={() => onSubmitCommand(transcript)}
          disabled={isLoading || isRecording || !transcript.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Send command"
        >
          <Send size={18} />
          <span className="ml-2 hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
}
