// Local-only dev config: extends the project vite config with an /api proxy
// so the SPA and the api-server share one origin (like Replit's router does).
import base from "./vite.config";

const cfg: any = base;
cfg.server = {
  ...cfg.server,
  proxy: {
    "/api": {
      target: "http://localhost:5000",
      changeOrigin: false,
    },
  },
};

export default cfg;
