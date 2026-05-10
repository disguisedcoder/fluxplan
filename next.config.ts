import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Turbopack bundled @prisma/client sonst fehlerhaft („Cannot find module“); Node lädt das Paket zur Laufzeit. */
  serverExternalPackages: ["@prisma/client"],
  /** Playwright und Tools nutzen oft 127.0.0.1 statt localhost — sonst blockt Next HMR/Dev-Ressourcen. */
  allowedDevOrigins: ["127.0.0.1"],
  /** Verhindert falsche Workspace-Wahl, wenn unterhalb von `fluxplan` noch andere lockfiles liegen. */
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
