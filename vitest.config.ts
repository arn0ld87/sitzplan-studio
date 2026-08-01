import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Eigene Konfiguration statt vite.config.ts: Das TanStack-Start-Plugin baut
// einen SSR-Server und ist im Testlauf weder nötig noch hilfreich.
export default defineConfig({
  plugins: [react()],
  // Vite 8 löst die @/-Pfade aus tsconfig.json selbst auf.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Gemessen wird die Domänenlogik. Routen und generierte Dateien
      // verzerren die Quote, ohne etwas über die Qualität auszusagen.
      include: ["src/data/**/*.ts", "src/lib/**/*.ts", "src/components/ui-kit/**/*.tsx"],
      exclude: ["src/routeTree.gen.ts", "src/integrations/supabase/types.ts"],
    },
  },
});
