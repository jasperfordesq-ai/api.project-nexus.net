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
          if (id.includes("@ant-design/charts") || id.includes("@antv")) return "vendor-charts";
          if (id.includes("@refinedev")) return "vendor-refine";
          if (id.includes("/antd/") || id.includes("@ant-design/icons") || id.includes("rc-")) return "vendor-ui";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          // let everything else (dayjs, axios, lodash, etc.) be split naturally by Rollup
          return undefined;
        },
      },
    },
  },
});
