import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export function extractAllCodeBlocks(messageContent: string): Array<{ language: string; code: string }> {
  const codeBlocks: Array<{ language: string; code: string }> = [];
  // Regex to find ```lang\ncode``` or ```\ncode```
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(messageContent)) !== null) {
    const language = match[1] || 'plaintext'; // Default to plaintext if no language specified
    const code = match[2].trim(); // Trim to remove leading/trailing newlines within the block
    codeBlocks.push({ language, code });
  }
  return codeBlocks;
}
