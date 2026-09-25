import { ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type AppLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "es", label: "ES — Español" },
  { value: "en", label: "EN — English" },
];

const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={language === "es" ? "Idioma" : "Language"}
          className={cn(
            "h-10 rounded-full bg-white/15 px-3 text-white hover:bg-white/25 hover:text-white",
            className
          )}
        >
          <Globe className="h-4 w-4" />
          <span>{language.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setLanguage(option.value)}
            className={cn("font-medium", language === option.value && "bg-accent")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;