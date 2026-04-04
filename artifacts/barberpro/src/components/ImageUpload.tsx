import React, { useState, useRef } from "react";
import { Camera, Loader2, X, Upload } from "lucide-react";
import { apiUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  compressMaxDimension?: number;
}

const SIZES = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

async function compressImage(file: File, maxDimension: number, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension && file.size <= 2 * 1024 * 1024) {
        resolve(file);
        return;
      }
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
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
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const compressed = await compressImage(file, compressMaxDimension);

      if (compressed.size > maxSizeMB * 1024 * 1024) {
        setError(`Arquivo muito grande mesmo após compressão (máx ${maxSizeMB}MB)`);
        setUploading(false);
        return;
      }

      const res = await fetch(apiUrl("/storage/uploads/request-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: compressed.name,
          size: compressed.size,
          contentType: compressed.type,
        }),
      });

      if (!res.ok) throw new Error("Erro ao preparar upload");
      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": compressed.type },
        body: compressed,
      });

      if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");

      const servingUrl = apiUrl(`/storage${objectPath}`);
      onChange(servingUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <button
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-1" /> {value ? "Trocar" : "Enviar"} foto</>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">JPG, PNG ou WebP</span>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
