import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Server secrets used to come from Base44's runtime; they now come from the environment.
const secretsModule = fileURLToPath(new URL("./src/lib/secrets.server.js", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "base44:runtime": secretsModule,
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [tanstackStart({ srcDirectory: "src" }), react()],
});
