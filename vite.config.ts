import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const ReactCompilerConfig = {};
// https://vitejs.dev/config/

export default defineConfig({
  server: {
    host: "0.0.0.0", // 使用 '0.0.0.0' 允许从任何 IP 访问
  },
  base: "./",
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
    tsconfigPaths(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService", "json"],
    }),
    nodePolyfills(),
  ],
});
