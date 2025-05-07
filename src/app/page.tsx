"use client";

import { useState, useEffect } from "react";
import { VoiceInput } from "@/components/voice-input";
import { ResultsDisplay } from "@/components/results-display";
import { interpretVoiceCommand, type InterpretVoiceCommandOutput } from "@/ai/flows/interpret-voice-command";
import { summarizeWebSearch, type SummarizeWebSearchOutput } from "@/ai/flows/summarize-web-search";
import { openApplication as openAppService } from "@/services/application-manager"; // Renamed to avoid conflict
import { searchFiles as searchFilesService, type FileInfo } from "@/services/file-search"; // Renamed

export default function OmniAssistPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<
    InterpretVoiceCommandOutput | SummarizeWebSearchOutput | FileInfo[] | string | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState("Click mic or type command");

  // Effect to update status based on recording and loading states
  useEffect(() => {
    if (isLoading) {
      setCurrentStatus("Processing...");
    } else if (isRecording) {
      setCurrentStatus("Listening...");
    } else {
      setCurrentStatus("Click mic or type command");
    }
  }, [isLoading, isRecording]);

  const handleToggleRecording = () => {
    if (isLoading) return;
    
    if (isRecording && transcript.trim()) {
      // If stopping recording and there's a transcript, process it
      processCommand(transcript);
    } else if (isRecording && !transcript.trim()) {
       // If stopping recording and no transcript, just stop.
       setIsRecording(false);
    } else {
      // Start recording
      setTranscript(""); // Clear previous transcript
      setAssistantResponse(null); // Clear previous response
      setIsRecording(true);
    }
  };

  const processCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsLoading(true);
    setIsRecording(false); // Stop recording if it was on
    setAssistantResponse(null); // Clear previous results
    setCurrentStatus("Processing...");

    try {
      const interpretation = await interpretVoiceCommand({ voiceCommand: command });
      setAssistantResponse(interpretation); // Show initial interpretation

      switch (interpretation.action) {
        case "openApplication":
          if (interpretation.applicationName) {
            await openAppService(interpretation.applicationName); // Mocked service call
            // Update status or response if needed, e.g.
            // setAssistantResponse(`Attempting to open ${interpretation.applicationName}... (Simulated)`);
            setCurrentStatus(`Opened ${interpretation.applicationName} (Simulated)`);
          } else {
            setAssistantResponse("Application name not specified.");
            setCurrentStatus("Error: Application name missing");
          }
          break;
        case "searchFiles":
          if (interpretation.searchQuery) {
            const files = await searchFilesService(interpretation.searchQuery); // Mocked service call
            setAssistantResponse(files);
            setCurrentStatus(files.length > 0 ? `Found ${files.length} file(s)` : "No files found");
          } else {
            setAssistantResponse("Search query not specified.");
            setCurrentStatus("Error: Search query missing");
          }
          break;
        case "webSearch":
          if (interpretation.webSearchQuery) {
            const summary = await summarizeWebSearch({ query: interpretation.webSearchQuery });
            setAssistantResponse(summary);
            setCurrentStatus("Web search complete");
          } else {
            setAssistantResponse("Web search query not specified.");
            setCurrentStatus("Error: Web search query missing");
          }
          break;
        case "unknown":
        default:
          // Response already set to interpretation
          setCurrentStatus("Command not understood");
          break;
      }
    } catch (error) {
      console.error("Error processing command:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setAssistantResponse(`Error: ${errorMessage}`);
      setCurrentStatus("Error processing command");
    } finally {
      setIsLoading(false);
      // Reset status to default if not specifically set by an action
      if (!isLoading && !isRecording && currentStatus === "Processing...") {
         setCurrentStatus("Click mic or type command");
      }
      setTranscript(""); // Clear input after processing
    }
  };

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-8 bg-background text-foreground">
      <header className="w-full mb-4 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-primary">OmniAssist</h1>
      </header>

      <section className="flex-grow w-full max-w-2xl my-4 sm:my-8 overflow-y-auto">
        <ResultsDisplay response={assistantResponse} isLoading={isLoading && !assistantResponse} />
      </section>

      <footer className="w-full max-w-md mt-4 sm:mt-8">
        <VoiceInput
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          transcript={transcript}
          onTranscriptChange={setTranscript}
          onSubmitCommand={processCommand}
          isLoading={isLoading}
          currentStatus={currentStatus}
        />
      </footer>
    </main>
  );
}
