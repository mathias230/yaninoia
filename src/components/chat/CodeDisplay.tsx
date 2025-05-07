
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState, useMemo } from "react";

interface CodeBlock {
  language: string;
  code: string;
}

interface CodeDisplayProps {
  blocks: CodeBlock[];
}

export function CodeDisplay({ blocks }: CodeDisplayProps) {
  const htmlBlock = useMemo(() => blocks.find(block => block.language.toLowerCase() === 'html'), [blocks]);
  
  const [activeTab, setActiveTab] = useState<string>("code");

  useEffect(() => {
    if (htmlBlock) {
      setActiveTab("preview");
    } else if (blocks.length > 0) {
      setActiveTab("code");
    }
  }, [htmlBlock, blocks]);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  const hasPreviewableHtml = !!htmlBlock;

  return (
    <Card className="mt-2 shadow-md">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${hasPreviewableHtml ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {hasPreviewableHtml && (
            <TabsTrigger value="preview">
              Vista Previa
            </TabsTrigger>
          )}
          <TabsTrigger value="code">Código</TabsTrigger>
        </TabsList>
        {hasPreviewableHtml && htmlBlock && (
          <TabsContent value="preview" className="p-0">
            <iframe
              srcDoc={htmlBlock.code}
              title="Vista Previa del Código"
              sandbox="allow-scripts allow-same-origin" 
              className="w-full h-80 border-0 rounded-b-md" 
              loading="lazy"
            />
          </TabsContent>
        )}
        <TabsContent value="code">
          <CardContent className="p-4 max-h-96 overflow-y-auto">
            {blocks.map((block, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  {block.language}
                </p>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code className="font-mono">{block.code}</code>
                </pre>
              </div>
            ))}
            {blocks.length === 0 && <p className="text-sm text-muted-foreground">No hay bloques de código para mostrar.</p>}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

