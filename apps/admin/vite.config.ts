import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5190,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@ant-design/charts")) return "vendor-charts";
          if (id.includes("@refinedev")) return "vendor-refine";
          if (id.includes("antd") || id.includes("@ant-design")) return "vendor-ui";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          return "vendor-misc";
        },
      },
    },
  },
});
