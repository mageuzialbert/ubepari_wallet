import { Download } from "lucide-react";

export function CsvLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
