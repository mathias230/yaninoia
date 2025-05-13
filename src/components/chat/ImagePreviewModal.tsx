
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NextImage from "next/image";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  altText?: string;
}

export function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  altText = "Vista previa de imagen" 
}: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-2 bg-background shadow-xl">
        <DialogHeader className="sr-only"> {/* Title can be visually hidden */}
          <DialogTitle>{altText}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full max-h-[85vh] flex justify-center items-center p-4">
          <NextImage
            src={imageUrl}
            alt={altText}
            width={1600} // Large base width, will be constrained by parent
            height={1200} // Large base height
            className="object-contain w-auto h-auto max-w-full max-h-[80vh] rounded-md shadow-lg"
            unoptimized={imageUrl.startsWith('data:image')} // Keep unoptimized for data URIs
            data-ai-hint="preview image"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
