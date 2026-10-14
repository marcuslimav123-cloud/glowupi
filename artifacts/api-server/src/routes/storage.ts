import express, { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  isLocalStorageMode,
  isValidLocalObjectId,
  saveLocalObject,
  readLocalObject,
} from "../lib/objectStorage.js";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Modo local (fora do Replit): o uploadURL devolvido por request-url aponta
// para esta rota, que grava o arquivo no disco da máquina.
router.put(
  "/storage/local-upload/:id",
  requireAuth,
  express.raw({ type: () => true, limit: "50mb" }),
  async (req: Request, res: Response) => {
    if (!isLocalStorageMode()) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { id } = req.params;
    if (!isValidLocalObjectId(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const contentType = req.headers["content-type"] || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "Apenas imagens são permitidas" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Arquivo vazio" });
      return;
    }
    try {
      await saveLocalObject(id, req.body, contentType);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error saving local object:", error);
      res.status(500).json({ error: "Failed to save file" });
    }
  }
);

router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body;
  if (!name || !size || !contentType) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (!contentType.startsWith("image/")) {
    res.status(400).json({ error: "Apenas imagens são permitidas" });
    return;
  }

  const maxSize = 50 * 1024 * 1024;
  if (size > maxSize) {
    res.status(400).json({ error: "Arquivo muito grande (máx 50MB)" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Error serving public object:", error);
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (isLocalStorageMode()) {
      // objectPath local tem o formato /objects/uploads/<uuid>
      const id = wildcardPath.replace(/^uploads\//, "");
      const { stream, contentType, size } = await readLocalObject(id);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(size));
      res.setHeader("Cache-Control", "public, max-age=3600");
      stream.pipe(res);
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      console.warn("Object not found:", error);
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Error serving object:", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
