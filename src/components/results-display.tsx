"use client";

import type { InterpretVoiceCommandOutput } from "@/ai/flows/interpret-voice-command";
import type { SummarizeWebSearchOutput } from "@/ai/flows/summarize-web-search";
import type { FileInfo } from "@/services/file-search";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, Globe, Power, AlertCircle, Info } from "lucide-react";

interface ResultsDisplayProps {
  response: InterpretVoiceCommandOutput | SummarizeWebSearchOutput | FileInfo[] | string | null;
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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={24} className="text-accent" />
            Welcome to OmniAssist!
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Click the microphone or type a command below to get started.
            You can ask me to open applications, search for files, or find information on the web.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (typeof response === 'string') {
    return (
      <Alert variant="default" className="shadow-md">
        <Info size={20} className="text-accent" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>{response}</AlertDescription>
      </Alert>
    );
  }

  if ('action' in response && 'reason' in response) {
    const res = response as InterpretVoiceCommandOutput;
    switch (res.action) {
      case 'openApplication':
        return (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power size={24} className="text-accent" />
                Opening Application
              </CardTitle>
              <CardDescription>{res.reason}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Attempting to open: <strong>{res.applicationName || "Unknown Application"}</strong></p>
            </CardContent>
          </Card>
        );
      case 'searchFiles':
        return (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={24} className="text-accent" />
                File Search
              </CardTitle>
              <CardDescription>{res.reason}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Searching for files matching: <strong>{res.searchQuery || "Unknown Query"}</strong></p>
              <p className="text-sm text-muted-foreground mt-2">(File search results will appear here if implemented)</p>
            </CardContent>
          </Card>
        );
      case 'webSearch':
        return (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={24} className="text-accent" />
                Web Search Initiated
              </CardTitle>
              <CardDescription>{res.reason}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Searching the web for: <strong>{res.webSearchQuery || "Unknown Query"}</strong></p>
              <p className="text-sm text-muted-foreground mt-2">(Summary will appear once processed)</p>
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

  if ('summary' in response) { // SummarizeWebSearchOutput
    const res = response as SummarizeWebSearchOutput;
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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

  if (Array.isArray(response) && response.length > 0 && 'name' in response[0] && 'path' in response[0]) {
    const files = response as FileInfo[];
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={24} className="text-accent" />
            Found Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="p-2 border rounded-md bg-secondary/50">
                <p className="font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.path}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }
  
  if (Array.isArray(response) && response.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={24} className="text-accent" />
            No Files Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>No files matched your search query.</p>
        </CardContent>
      </Card>
    );
  }

  return (
     <Alert variant="destructive" className="shadow-md">
      <AlertCircle size={20} />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>An unexpected response format was received.</AlertDescription>
    </Alert>
  );
}
