"use client";

import { useState, useEffect, type CSSProperties  } from "react";
import { VoiceInput } from "@/components/voice-input";
import { ResultsDisplay } from "@/components/results-display";
import { interpretVoiceCommand, type InterpretVoiceCommandOutput } from "@/ai/flows/interpret-voice-command";
import { summarizeWebSearch, type SummarizeWebSearchOutput } from "@/ai/flows/summarize-web-search";
import { answerGeneralQuestion, type AnswerGeneralQuestionOutput } from "@/ai/flows/answer-general-question";
import { openApplication as openAppService } from "@/services/application-manager";
import { searchFiles as searchFilesService, type FileInfo } from "@/services/file-search";

export default function OmniAssistPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<
    InterpretVoiceCommandOutput | SummarizeWebSearchOutput | AnswerGeneralQuestionOutput | FileInfo[] | string | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState("Click mic or type command");

  // Effect to update status based on recording and loading states
  useEffect(() => {
    if (isLoading) {
      setCurrentStatus("Processing...");
    } else if (isRecording) {
      setCurrentStatus("Listening...");
    } else {
       if (assistantResponse) {
        // If there's a response, keep status related to it, otherwise default
        // This logic might need refinement based on desired UX
      } else {
        setCurrentStatus("Click mic or type command");
      }
    }
  }, [isLoading, isRecording, assistantResponse]);

  const handleToggleRecording = () => {
    if (isLoading) return;
    
    if (isRecording && transcript.trim()) {
      processCommand(transcript);
    } else if (isRecording && !transcript.trim()) {
       setIsRecording(false);
    } else {
      setTranscript(""); 
      setAssistantResponse(null); 
      setIsRecording(true);
    }
  };

  const processCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsLoading(true);
    setIsRecording(false); 
    setAssistantResponse(null);
    setCurrentStatus("Interpreting command...");

    try {
      const interpretation = await interpretVoiceCommand({ voiceCommand: command });
      setAssistantResponse(interpretation); 

      switch (interpretation.action) {
        case "openApplication":
          if (interpretation.applicationName) {
            setCurrentStatus(`Opening ${interpretation.applicationName}...`);
            await openAppService(interpretation.applicationName); 
            setAssistantResponse({ ...interpretation, reason: `Successfully simulated opening ${interpretation.applicationName}.` });
            setCurrentStatus(`Opened ${interpretation.applicationName} (Simulated)`);
          } else {
            setAssistantResponse("Error: Application name not specified for opening.");
            setCurrentStatus("Error: Application name missing");
          }
          break;
        case "searchFiles":
          if (interpretation.searchQuery) {
            setCurrentStatus(`Searching files for "${interpretation.searchQuery}"...`);
            const files = await searchFilesService(interpretation.searchQuery); 
            setAssistantResponse(files);
            setCurrentStatus(files.length > 0 ? `Found ${files.length} file(s)` : "No files found");
          } else {
            setAssistantResponse("Error: Search query not specified for file search.");
            setCurrentStatus("Error: Search query missing");
          }
          break;
        case "webSearch":
          if (interpretation.webSearchQuery) {
            setCurrentStatus(`Searching the web for "${interpretation.webSearchQuery}"...`);
            const summary = await summarizeWebSearch({ query: interpretation.webSearchQuery });
            setAssistantResponse(summary);
            setCurrentStatus("Web search complete");
          } else {
            setAssistantResponse("Error: Web search query not specified.");
            setCurrentStatus("Error: Web search query missing");
          }
          break;
        case "answerQuestion":
          if (interpretation.question) {
            setCurrentStatus(`Finding an answer for "${interpretation.question}"...`);
            const answer = await answerGeneralQuestion({ question: interpretation.question });
            setAssistantResponse(answer);
            setCurrentStatus("Answer provided.");
          } else {
            setAssistantResponse("Error: Question not specified for answering.");
            setCurrentStatus("Error: Question not specified");
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
       // More nuanced status reset
      if (!isLoading && !isRecording && currentStatus.startsWith("Processing") || currentStatus.startsWith("Interpreting")) {
         setCurrentStatus("Click mic or type command");
      }
      // Do not clear transcript here, user might want to re-submit or edit
      // setTranscript(""); 
    }
  };
  
  const orbits: CSSProperties[] = Array(3).fill(null).map((_, i) => ({
    position: 'absolute',
    border: '1px solid var(--accent)', // Use accent color from theme
    borderRadius: '50%',
    width: `${100 + i * 40}px`,
    height: `${100 + i * 40}px`,
    animation: `spin ${(i + 1) * 5}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`,
    opacity: 0.3,
  }));


  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-8 bg-background text-foreground relative overflow-hidden">
       <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px 2px hsl(var(--accent) / 0.7); }
          50% { box-shadow: 0 0 20px 8px hsl(var(--accent) / 0.3); }
        }
      `}</style>
      
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="relative flex items-center justify-center w-64 h-64">
          {orbits.map((style, index) => (
            <div key={index} style={style} />
          ))}
          <div 
            className="w-16 h-16 bg-accent rounded-full"
            style={{ animation: 'pulse-glow 3s infinite ease-in-out', opacity: 0.5 }}
            data-ai-hint="abstract ai"
          />
        </div>
      </div>


      <header className="w-full mb-4 sm:mb-8 z-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-center text-primary drop-shadow-md">OmniAssist</h1>
        <p className="text-center text-muted-foreground text-lg">Your AI Powered PC Assistant</p>
      </header>

      <section className="flex-grow w-full max-w-2xl my-4 sm:my-8 overflow-y-auto z-10 bg-card/80 backdrop-blur-sm rounded-lg shadow-xl p-4">
        <ResultsDisplay 
            response={assistantResponse} 
            isLoading={isLoading && (!assistantResponse || ('action' in assistantResponse && assistantResponse.action !== 'unknown'))} 
        />
      </section>

      <footer className="w-full max-w-md mt-4 sm:mt-8 z-10">
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
