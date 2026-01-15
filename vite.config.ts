import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [react()],
		base: env.VITE_BASE || "/", // set via env to run in subfolder or root
		server: {
			host: true, // allow access from other devices on the LAN
		},
		css: {
			preprocessorOptions: {
				scss: {
					api: "modern",
				},
			},
		},
	};
});
