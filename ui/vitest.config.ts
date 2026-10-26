import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { "import.meta.env.VITE_DEFAULT_LOCALE": JSON.stringify("en") },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/dist/Lexical.mjs"),
    },
  },
  test: {
    environment: "node",
    css: { include: [/motion-tokens\.css/] },
    setupFiles: ["./vitest.setup.ts"],
  },
});
