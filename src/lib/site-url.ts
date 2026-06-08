import "server-only";

function normalizeUrl(value: string): string {
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol;
}

export function getConfiguredSiteUrl(): string | null {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  return value ? normalizeUrl(value) : null;
}

export function getRequestOrigin(req: Request): string {
  const fallback = new URL(req.url).origin;
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!forwardedHost) return fallback;

  const host = forwardedHost.split(",")[0]?.trim();
  if (!host) return fallback;

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`;
}

export function getAppOrigin(req: Request): string {
  return getConfiguredSiteUrl() ?? getRequestOrigin(req);
}
