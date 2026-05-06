import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "pt";

  const change = (lng: "pt" | "en") => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t("language.label")}>
          <Languages className="w-4 h-4" />
          <span className="sr-only">{t("language.label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => change("pt")}
          className={current === "pt" ? "font-semibold" : ""}
        >
          🇧🇷 {t("language.pt")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => change("en")}
          className={current === "en" ? "font-semibold" : ""}
        >
          🇺🇸 {t("language.en")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageToggle;
