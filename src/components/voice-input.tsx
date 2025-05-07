"use client";

import type * as React from "react";
import { Mic, Send, Loader2 } from "lucide-react";
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
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg shadow-xl w-full bg-card/90 backdrop-blur-sm">
      <Button
        onClick={onToggleRecording}
        size="lg" 
        variant="default"
        className={cn(
          "w-24 h-24 rounded-full text-accent-foreground transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-accent hover:bg-accent/90",
          isLoading && "opacity-70 cursor-not-allowed bg-muted hover:bg-muted"
        )}
        disabled={isLoading}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isLoading && isRecording ? <Loader2 size={40} className="animate-spin" /> : <Mic size={40} />}
      </Button>
      <p className="text-sm text-muted-foreground h-5 min-h-[1.25rem] text-center px-2">
        {currentStatus}
      </p>
      <div className="flex w-full gap-2 items-center">
        <Input
          type="text"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Or type your command here..."
          className="flex-grow text-base h-12"
          disabled={isLoading || isRecording}
          onKeyDown={handleKeyDown}
          aria-label="Type your command"
        />
        <Button
          onClick={() => onSubmitCommand(transcript)}
          disabled={isLoading || isRecording || !transcript.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4 sm:px-6"
          aria-label="Send command"
        >
          {isLoading && !isRecording ? <Loader2 size={18} className="animate-spin sm:mr-2" /> : <Send size={18} className="sm:mr-2" />}
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
}
```