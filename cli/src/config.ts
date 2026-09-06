import Conf from "conf";

interface TokenixConfig {
  apiKey: string;
  gatewayUrl: string;
  analyticsUrl: string;
}

export const config = new Conf<TokenixConfig>({
  projectName: "tokenix",
  defaults: {
    apiKey: "",
    gatewayUrl: "https://cozy-patience-production-815c.up.railway.app",
    analyticsUrl: "https://ai-gateway-production-a74e.up.railway.app",
  },
});

export function getKey(): string {
  const key = config.get("apiKey");
  if (!key) {
    console.error("Not logged in. Run: tokenix login");
    process.exit(1);
  }
  return key;
}
