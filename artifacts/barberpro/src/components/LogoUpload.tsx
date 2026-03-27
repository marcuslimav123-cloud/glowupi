import React, { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, RotateCcw, RotateCw, Check } from "lucide-react";
import { apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface LogoUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = bBoxWidth;
  rotCanvas.height = bBoxHeight;
  const rotCtx = rotCanvas.getContext("2d")!;
  rotCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    rotCanvas,
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
  const [rotation, setRotation] = useState(0);
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
      setRotation(0);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
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
      setCropDialogOpen(false);
      setImageSrc(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload";
      console.error("Upload error:", err);
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div
        className="w-full cursor-pointer group relative rounded-lg overflow-hidden bg-black/[0.03] border border-black/[0.06] hover:border-primary/30 transition-colors"
        onClick={() => inputRef.current?.click()}
        style={{ aspectRatio: "16/9" }}
      >
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : value ? (
          <>
            <img src={value} alt="Logo" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-medium">Adicionar logo</span>
          </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar Logo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full bg-neutral-900 rounded-lg overflow-hidden" style={{ height: "320px" }}>
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={16 / 9}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap w-10">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setRotation((r) => r - 90)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setRotation((r) => r + 90)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCropDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCropConfirm}>
                <Check className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
