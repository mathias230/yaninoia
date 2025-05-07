
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Removed DialogClose as it's part of DialogContent now
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Zap, XCircle } from 'lucide-react';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCapture: (dataUri: string) => void;
}

const MAX_WIDTH = 640; 

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
        console.error('Error al acceder a la cámara:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a la Cámara Denegado',
          description: 'Por favor, habilita los permisos de cámara en la configuración de tu navegador.',
        });
        onClose(); 
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
        const dataUri = canvas.toDataURL('image/jpeg'); 
        onPhotoCapture(dataUri);
        onClose();
      } else {
         toast({ variant: "destructive", title: "Error de Captura", description: "No se pudo obtener el contexto del lienzo."});
      }
    } else {
         toast({ variant: "destructive", title: "Error de Captura", description: "La cámara no está lista o el permiso fue denegado."});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera /> Tomar una Foto</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          {hasCameraPermission === null && <p>Solicitando permiso de cámara...</p>}
          {hasCameraPermission === false && (
             <Alert variant="destructive">
              <XCircle className="h-4 w-4"/>
              <AlertTitle>Acceso a la Cámara Requerido</AlertTitle>
              <AlertDescription>
                El permiso de cámara fue denegado o no está disponible. Por favor, revisa la configuración de tu navegador.
              </AlertDescription>
            </Alert>
          )}

          <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCapture} disabled={!hasCameraPermission || !stream} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Zap className="mr-2 h-4 w-4" /> Capturar Foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

