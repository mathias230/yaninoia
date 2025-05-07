"use client";

import type { InterpretVoiceCommandOutput } from "@/ai/flows/interpret-voice-command";
import type { SummarizeWebSearchOutput } from "@/ai/flows/summarize-web-search";
import type { AnswerGeneralQuestionOutput } from "@/ai/flows/answer-general-question";
import type { FileInfo } from "@/services/file-search";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, Globe, Power, AlertCircle, Info, MessageSquare, HelpCircle } from "lucide-react";

interface ResultsDisplayProps {
  response: InterpretVoiceCommandOutput | SummarizeWebSearchOutput | AnswerGeneralQuestionOutput | FileInfo[] | string | null;
  isLoading: boolean;
}

export function ResultsDisplay({ response, isLoading }: ResultsDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  if (!response) {
    return (
      <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Info size={28} className="text-accent" />
            Welcome to OmniAssist!
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-base">
            I'm here to help you with tasks on your PC and answer your questions.
            Click the microphone or type a command below to get started.
          </p>
          <ul className="list-disc list-inside mt-3 text-muted-foreground space-y-1 pl-2">
            <li>Open applications (e.g., "Open Calculator")</li>
            <li>Search for files (e.g., "Find my quarterly report")</li>
            <li>Search the web (e.g., "Latest news on space exploration")</li>
            <li>Ask questions (e.g., "What's the weather like?" or "How to make pasta?")</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (typeof response === 'string') {
     // Check if it's an error string
    if (response.toLowerCase().startsWith('error:')) {
      return (
        <Alert variant="destructive" className="shadow-md">
          <AlertCircle size={20} />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{response.substring(6).trim()}</AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert variant="default" className="shadow-md bg-card/90 backdrop-blur-sm">
        <Info size={20} className="text-accent" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>{response}</AlertDescription>
      </Alert>
    );
  }

  // Handle InterpretVoiceCommandOutput
  if ('action' in response && 'reason' in response) {
    const res = response as InterpretVoiceCommandOutput;
    // Only display initial interpretation if no specific result is pending for certain actions
    if (res.action === 'webSearch' || res.action === 'searchFiles' || res.action === 'answerQuestion') {
        // For these actions, we expect a follow-up result, so we can show a loading/interim state or nothing
        // For now, showing a card to indicate the interpreted action
         return (
          <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                {res.action === 'webSearch' && <Globe size={24} className="text-accent" />}
                {res.action === 'searchFiles' && <FileText size={24} className="text-accent" />}
                {res.action === 'answerQuestion' && <HelpCircle size={24} className="text-accent" />}
                Interpreted Action: {res.action.replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
              <CardDescription>{res.reason}</CardDescription>
            </CardHeader>
            <CardContent>
              {res.webSearchQuery && <p>Query: <strong>{res.webSearchQuery}</strong></p>}
              {res.searchQuery && <p>Query: <strong>{res.searchQuery}</strong></p>}
              {res.question && <p>Question: <strong>{res.question}</strong></p>}
              <p className="text-sm text-muted-foreground mt-2">(Processing...)</p>
            </CardContent>
          </Card>
        );
    }
    switch (res.action) {
      case 'openApplication':
        return (
          <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Power size={24} className="text-accent" />
                Opening Application
              </CardTitle>
              <CardDescription>{res.reason}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Attempting to open: <strong>{res.applicationName || "Unknown Application"}</strong> (Simulated)</p>
            </CardContent>
          </Card>
        );
      case 'unknown':
      default:
        return (
          <Alert variant="destructive" className="shadow-md">
            <AlertCircle size={20} />
            <AlertTitle>Unknown Command</AlertTitle>
            <AlertDescription>{res.reason || "Sorry, I didn't understand that command."}</AlertDescription>
          </Alert>
        );
    }
  }

  // Handle SummarizeWebSearchOutput
  if ('summary' in response && !('answer' in response) && !('action' in response)) {
    const res = response as SummarizeWebSearchOutput;
    return (
      <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Globe size={24} className="text-accent" />
             Web Search Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{res.summary}</p>
        </CardContent>
      </Card>
    );
  }
  
  // Handle AnswerGeneralQuestionOutput
  if ('answer' in response && 'originalQuestion' in response && !('action' in response)) {
    const res = response as AnswerGeneralQuestionOutput;
    return (
      <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <MessageSquare size={24} className="text-accent" />
            Assistant's Answer
          </CardTitle>
          {res.originalQuestion && <CardDescription>For your question: "{res.originalQuestion}"</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-foreground">{res.answer}</p>
        </CardContent>
      </Card>
    );
  }

  // Handle FileInfo[]
  if (Array.isArray(response)) {
    if (response.length > 0 && 'name' in response[0] && 'path' in response[0]) {
      const files = response as FileInfo[];
      return (
        <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText size={24} className="text-accent" />
              Found Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="p-3 border rounded-md bg-secondary/70 hover:bg-secondary transition-colors">
                  <p className="font-semibold text-secondary-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.path}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );
    } else if (response.length === 0) {
       return (
        <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText size={24} className="text-accent" />
              No Files Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No files matched your search query.</p>
          </CardContent>
        </Card>
      );
    }
  }


  return (
     <Alert variant="destructive" className="shadow-md">
      <AlertCircle size={20} />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>An unexpected response format was received or the action could not be completed.</AlertDescription>
    </Alert>
  );
}
