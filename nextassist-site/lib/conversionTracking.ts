export type ConversionEvent = "demo_view" | "demo_submit" | "contact_submit" | "whatsapp_click";

const endpoint = process.env.NEXT_PUBLIC_CONVERSION_ENDPOINT;

export function trackConversion(name: ConversionEvent): void {
  if (!endpoint || typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({
    name,
    path: window.location.pathname,
    source: params.get("utm_source") ?? "",
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
    content: params.get("utm_content") ?? "",
  });
  void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
}
