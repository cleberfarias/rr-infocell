import fdLogo from "@/assets/logo-fd-softwares.png";

type DeveloperCreditProps = {
  variant?: "compact" | "sidebar";
};

export const DeveloperCredit = ({
  variant = "compact",
}: DeveloperCreditProps) => {
  const isSidebar = variant === "sidebar";

  return (
    <a
      href="https://fdsoftware.com.br/"
      target="_blank"
      rel="noreferrer"
      className={
        "inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary " +
        (isSidebar ? "justify-end" : "justify-center")
      }
      aria-label="Desenvolvido por FD Softwares"
    >
      <span className="text-xs">Desenvolvido por</span>
      <img
        src={fdLogo}
        alt="FD Softwares"
        className={isSidebar ? "h-8 w-auto" : "h-7 w-auto"}
        loading="lazy"
      />
    </a>
  );
};
