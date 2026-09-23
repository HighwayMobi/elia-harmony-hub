import { Signal, Globe, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export type LineType = "mobile" | "travel" | "fiber" | string | undefined;

interface LineTypeIconProps {
  type: LineType;
  /** Estado de la línea; si se pasa, sobrescribe el color (activo=verde, suspendido=rojo). */
  status?: string;
  className?: string;
  /** Si true, renderiza un cuadrado con fondo de color (estilo tarjeta). */
  boxed?: boolean;
  size?: "sm" | "md" | "lg";
}

// Sobrescribe color/fondo según el estado de la línea.
const STATUS_OVERRIDE: Record<string, { color: string; bg: string }> = {
  active: { color: "text-[#2EB872]", bg: "bg-[#DEF4E8]" },
  suspended: { color: "text-[#E0392E]", bg: "bg-[#FBE3E0]" },
};

const CONFIG: Record<
  string,
  { Icon: typeof Signal; color: string; bg: string; label: string }
> = {
  mobile: {
    Icon: Signal,
    color: "text-[#E84F2E]",
    bg: "bg-[#FDE8E1]",
    label: "Móvil",
  },
  travel: {
    Icon: Globe,
    color: "text-[#2E6BE8]",
    bg: "bg-[#E1ECFD]",
    label: "Travel eSIM",
  },
  fiber: {
    Icon: Wifi,
    color: "text-[#2EB872]",
    bg: "bg-[#DEF4E8]",
    label: "Fibra",
  },
};

export const getLineTypeLabel = (type: LineType) =>
  CONFIG[String(type || "").toLowerCase()]?.label || "Línea";

const SIZE_BOX = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" } as const;
const SIZE_ICON = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

export const LineTypeIcon = ({
  type,
  className,
  boxed = false,
  size = "md",
}: LineTypeIconProps) => {
  const cfg = CONFIG[String(type || "").toLowerCase()] || CONFIG.mobile;
  const { Icon, color, bg } = cfg;

  if (boxed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg shrink-0",
          SIZE_BOX[size],
          bg,
          className
        )}
      >
        <Icon className={cn(SIZE_ICON[size], color)} />
      </div>
    );
  }

  return <Icon className={cn(SIZE_ICON[size], color, className)} />;
};

export default LineTypeIcon;
