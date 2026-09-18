import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ecophaser: resolve(__dirname, "use-case/ecophaser/index.html"),
        telemetry: resolve(__dirname, "use-case/telemetryinsights/index.html"),
        unibite: resolve(__dirname, "use-case/unibite/index.html"),
      },
    },
  },
});
