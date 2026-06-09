import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardBrandLogoProps {
  brand?: string;
  className?: string;
}

export const CardBrandLogo = ({ brand, className }: CardBrandLogoProps) => {
  const b = (brand || "").toLowerCase();

  if (b === "visa") {
    return (
      <svg
        viewBox="0 0 48 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-8 w-12", className)}
      >
        <rect width="48" height="32" rx="6" fill="#F5E6D3" />
        <text
          x="24"
          y="21"
          textAnchor="middle"
          fill="#2F2A33"
          fontSize="13"
          fontWeight="800"
          fontStyle="italic"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          VISA
        </text>
      </svg>
    );
  }

  if (b === "mastercard") {
    return (
      <svg
        viewBox="0 0 48 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-8 w-12", className)}
      >
        <rect width="48" height="32" rx="6" fill="#F5E6D3" />
        <circle cx="18.5" cy="16" r="9" fill="#A799B7" />
        <circle cx="29.5" cy="16" r="9" fill="#2F2A33" fillOpacity="0.35" />
      </svg>
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-12 items-center justify-center rounded-md bg-[#F5E6D3] text-[10px] font-bold text-[#2F2A33]",
        className
      )}
    >
      <CreditCard className="h-4 w-4 text-[#2F2A33]" />
    </div>
  );
};

export default CardBrandLogo;
