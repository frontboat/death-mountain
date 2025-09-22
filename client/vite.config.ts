import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import mkcert from "vite-plugin-mkcert";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const agentProxyTarget = env.VITE_AGENT_PROXY_TARGET;

    return {
        plugins: [react(), wasm(), topLevelAwait(), mkcert()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            proxy: agentProxyTarget
                ? {
                    "/api/agent": {
                        target: agentProxyTarget,
                        changeOrigin: true,
                        secure: false,
                    },
                }
                : undefined,
        },
    };
});
