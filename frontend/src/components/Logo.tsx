import { tenantConfig } from "@/config/tenantConfig";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <img
    src={tenantConfig.logo}
    alt={`${tenantConfig.tenantName} - Assistencia Tecnica Especializada`}
    className={className}
    width={1024}
    height={1024}
    style={{ objectFit: "contain", width: "auto" }}
    loading="lazy"
  />
);
