import React, { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, X, Upload, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { apiUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
  label?: string;
  placeholder?: React.ReactNode;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
  /** Lado máximo (px) da imagem final enviada. */
  compressMaxDimension?: number;
  /** Proporção do recorte (largura/altura). Padrão 1 (quadrado/círculo). */
  aspect?: number;
}

const SIZES = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Recorta a área escolhida (em pixels da imagem original), aplica a rotação
// e devolve um JPEG já no tamanho final.
async function cropToFile(src: string, area: Area, rotation: number, maxDimension: number, name: string): Promise<File> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = img.width * cos + img.height * sin;
  const rotH = img.width * sin + img.height * cos;

  const rotated = document.createElement("canvas");
  rotated.width = Math.round(rotW);
  rotated.height = Math.round(rotH);
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const scale = Math.min(1, maxDimension / Math.max(area.width, area.height));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(area.width * scale));
  out.height = Math.max(1, Math.round(area.height * scale));
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Não foi possível processar a imagem");
  return new File([blob], name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function ImageUpload({
  value,
  onChange,
  shape = "circle",
  size = "md",
  label,
  placeholder,
  className,
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 50,
  compressMaxDimension = 1200,
  aspect = 1,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Etapa de ajuste (recorte/zoom) antes do envio
  const [editing, setEditing] = useState<{ src: string; name: string } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => setCroppedArea(areaPixels), []);

  const upload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`Arquivo muito grande (máx ${maxSizeMB}MB)`);
    }
    const res = await fetch(apiUrl("/storage/uploads/request-url"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!res.ok) throw new Error("Erro ao preparar upload");
    const data = await res.json().catch(() => null);
    const uploadURL = data?.uploadURL;
    const objectPath = data?.objectPath;
    if (typeof uploadURL !== "string" || !uploadURL) throw new Error("Resposta inválida do servidor (uploadURL)");
    if (typeof objectPath !== "string" || !objectPath) throw new Error("Resposta inválida do servidor (objectPath)");

    const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");

    const path = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
    onChange(apiUrl(`/storage${path}`));
  };

  const startEditing = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedArea(null);
      setEditing({ src: String(reader.result), name: file.name });
    };
    reader.onerror = () => setError("Não foi possível ler a imagem");
    reader.readAsDataURL(file);
  };

  const confirmCrop = async () => {
    if (!editing || !croppedArea) return;
    setUploading(true);
    try {
      const file = await cropToFile(editing.src, croppedArea, rotation, compressMaxDimension, editing.name);
      setEditing(null);
      await upload(file);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startEditing(file);
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const containerClass = cn(
    SIZES[size],
    shape === "circle" ? "rounded-full" : "rounded-xl",
    "relative group cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden flex items-center justify-center bg-muted",
    className
  );

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className="flex items-center gap-4">
        <div className={containerClass} onClick={() => inputRef.current?.click()}>
          {value ? (
            <>
              <img
                src={value}
                alt="Preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            placeholder || <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-1" /> {value ? "Trocar" : "Enviar"} foto</>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">JPG, PNG ou WebP · você ajusta o enquadramento antes de enviar</span>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !uploading) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Arraste para posicionar e use o zoom para enquadrar. O que estiver dentro da área marcada é o que vai aparecer.</p>
          <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden">
            {editing && (
              <Cropper
                image={editing.src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                cropShape={shape === "circle" ? "round" : "rect"}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Zoom"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 ml-1" onClick={() => setRotation((r) => (r + 90) % 360)} title="Girar 90°">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={uploading}>Cancelar</Button>
            <Button type="button" onClick={confirmCrop} disabled={uploading || !croppedArea}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</> : "Usar esta foto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
