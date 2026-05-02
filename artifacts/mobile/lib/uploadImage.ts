import * as ImagePicker from "expo-image-picker";
import { Platform, Alert } from "react-native";
import { apiUrl } from "@/lib/api";
import { getItem } from "@/lib/storage";

const TOKEN_KEY = "glow_upi_auth_token";

export type PickedImage = { uri: string; mimeType: string; fileName: string; fileSize: number };

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permissão negada", "Habilite o acesso à galeria nas configurações.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType || "image/jpeg",
    fileName: a.fileName || `photo-${Date.now()}.jpg`,
    fileSize: a.fileSize || 0,
  };
}

export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permissão negada", "Habilite o acesso à câmera nas configurações.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType || "image/jpeg",
    fileName: a.fileName || `photo-${Date.now()}.jpg`,
    fileSize: a.fileSize || 0,
  };
}

export async function uploadPickedImage(picked: PickedImage): Promise<string> {
  const token = await getItem(TOKEN_KEY);
  if (!token) throw new Error("Sessão expirada");

  let blob: Blob;
  let size = picked.fileSize;
  if (Platform.OS === "web") {
    const r = await fetch(picked.uri);
    blob = await r.blob();
    size = blob.size;
  } else {
    const r = await fetch(picked.uri);
    blob = await r.blob();
    if (!size) size = blob.size;
  }

  const reqRes = await fetch(apiUrl("/storage/uploads/request-url"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: picked.fileName, size: size || blob.size, contentType: picked.mimeType }),
  });
  if (!reqRes.ok) {
    const err = await reqRes.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao gerar URL de upload");
  }
  const { uploadURL, objectPath } = await reqRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": picked.mimeType },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Falha no envio da imagem");

  return objectPath as string;
}

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  if (path.startsWith("/objects/") || path.startsWith("/public-objects/")) {
    return `${base}/api/storage${path}`;
  }
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}
