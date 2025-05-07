
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Zap, XCircle } from 'lucide-react';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCapture: (dataUri: string) => void;
}

const MAX_WIDTH = 640; // Max width for captured photo

export function PhotoCaptureModal({ isOpen, onClose, onPhotoCapture }: PhotoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const cleanupStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (!isOpen) {
      cleanupStream();
      return;
    }

    const getCameraPermission = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        onClose(); // Close modal if permission denied
      }
    };

    getCameraPermission();

    return () => {
      cleanupStream();
    };
  }, [isOpen, toast, onClose, cleanupStream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > MAX_WIDTH) {
        width = MAX_WIDTH;
        height = width / aspectRatio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg'); // Or image/png
        onPhotoCapture(dataUri);
        onClose();
      } else {
         toast({ variant: "destructive", title: "Capture Error", description: "Could not get canvas context."});
      }
    } else {
         toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready or permission denied."});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera /> Take a Photo</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          {hasCameraPermission === null && <p>Requesting camera permission...</p>}
          {hasCameraPermission === false && (
             <Alert variant="destructive">
              <XCircle className="h-4 w-4"/>
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Camera permission was denied or is unavailable. Please check your browser settings.
              </AlertDescription>
            </Alert>
          )}

          <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCapture} disabled={!hasCameraPermission || !stream} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Zap className="mr-2 h-4 w-4" /> Capture Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
