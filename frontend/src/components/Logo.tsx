import { useTenant } from "@/contexts/TenantContext";

export const Logo = ({ className = "h-10" }: { className?: string }) => {
  const { branding, tenant } = useTenant();

  return (
    <img
      src={branding.logo}
      alt={`${tenant.tenantName} - Assistencia Tecnica Especializada`}
      className={className}
      width={1024}
      height={1024}
      style={{ objectFit: "contain", width: "auto" }}
      loading="lazy"
    />
  );
};
