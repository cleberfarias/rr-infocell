import logo from "@/assets/logo-rrinfocell.png";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <img
    src={logo}
    alt="RR Infocell — Assistência Técnica Especializada"
    className={className}
    width={1024}
    height={1024}
    style={{ objectFit: "contain", width: "auto" }}
    loading="lazy"
  />
);
