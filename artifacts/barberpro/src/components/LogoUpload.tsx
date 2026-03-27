import React, { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, X, Crop, Check } from "lucide-react";
import { apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface LogoUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Erro ao gerar imagem cortada"));
      },
      "image/png",
      1
    );
  });
}

export function LogoUpload({ value, onChange }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande (máx 5MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setCropDialogOpen(false);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], "logo.png", { type: "image/png" });

      const res = await fetch(apiUrl("/storage/uploads/request-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error("Erro ao preparar upload");
      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");

      const servingUrl = apiUrl(`/storage${objectPath}`);
      onChange(servingUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload";
      console.error("Upload error:", err);
      setError(message);
    } finally {
      setUploading(false);
      setImageSrc(null);
    }
  };

  return (
    <>
      <div
        className="relative group cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <div className="h-8 w-8 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
          {uploading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : value ? (
            <img src={value} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Crop className="h-3 w-3 text-white" />
        </div>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="h-2 w-2" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-[10px] text-destructive mt-1">{error}</p>
      )}

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Logo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-64 bg-black/5 rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCropDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCropConfirm}>
              <Check className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
