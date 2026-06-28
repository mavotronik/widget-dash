import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        ws: true,
      },
      "/uploads": "http://localhost:3001",
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
        edit: "edit.html",
      },
    },
  },
});
