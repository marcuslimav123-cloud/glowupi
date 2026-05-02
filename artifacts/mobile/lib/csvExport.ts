import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const head = headers.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  return "\uFEFF" + head + "\n" + body + "\n";
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

export async function shareCsv(filename: string, csv: string): Promise<void> {
  const safe = safeFilename(filename) || "relatorio";
  const finalName = safe.endsWith(".csv") ? safe : `${safe}.csv`;

  if (Platform.OS === "web") {
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    } catch {
      await Share.share({ message: csv, title: finalName });
      return;
    }
  }

  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
  if (!dir) {
    await Share.share({ message: csv, title: finalName });
    return;
  }
  const fileUri = `${dir}${finalName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: "utf8" as any });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: finalName,
      UTI: "public.comma-separated-values-text",
    });
  } else {
    await Share.share({ url: fileUri, message: finalName, title: finalName });
  }
}

export async function shareText(filename: string, text: string, mimeType = "text/plain"): Promise<void> {
  const safe = safeFilename(filename) || "arquivo";
  if (Platform.OS === "web") {
    try {
      const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    } catch {
      await Share.share({ message: text, title: safe });
      return;
    }
  }
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
  if (!dir) {
    await Share.share({ message: text, title: safe });
    return;
  }
  const fileUri = `${dir}${safe}`;
  await FileSystem.writeAsStringAsync(fileUri, text, { encoding: "utf8" as any });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: safe });
  } else {
    await Share.share({ url: fileUri, message: safe, title: safe });
  }
}
