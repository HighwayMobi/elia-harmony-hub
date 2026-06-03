import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Bell, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ftPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getFTSession, onFTSessionChange } from "@/lib/ft-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NotificationItem {
  id: string;
  title?: string;
  content?: string;
  type?: string;
  is_read?: boolean;
  created_at?: string;
}



const NotificationsBell = () => {
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const fetchCount = useCallback(async () => {
    try {
      const res = await ftPost("/get-notifications-count");
      const inner = res.data?.data?.data ?? res.data?.data;
      const c = Number(inner?.count ?? 0);
      setCount(Number.isFinite(c) ? c : 0);
    } catch {
      // silent
    }
  }, []);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await ftPost("/get-notifications", { page: p });
      const inner = res.data?.data?.data ?? res.data?.data;
      const list: NotificationItem[] = Array.isArray(inner?.items) ? inner.items : [];
      setItems(list);
      setPage(Number(inner?.page) || p);
      setPageCount(Number(inner?.page_count) || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and on every route change (page navigation)
  useEffect(() => {
    fetchCount();
  }, [fetchCount, location.pathname]);

  useEffect(() => {
    // Refetch on line/session changes
    let lastLineId = String(getFTSession()?.line_id ?? "");
    const offSession = onFTSessionChange(() => {
      const cur = String(getFTSession()?.line_id ?? "");
      if (cur !== lastLineId) {
        lastLineId = cur;
        fetchCount();
      }
    });

    // Refetch when tab becomes visible again (page refresh / focus)
    const onVis = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", fetchCount);

    return () => {
      offSession();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", fetchCount);
    };
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchPage(1);
  }, [open, fetchPage]);

  const markRead = async (n: NotificationItem) => {
    if (n.is_read) return;
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));
    setCount((c) => Math.max(0, c - 1));
    try {
      await ftPost("/mark-notification-read", { id: n.id });
    } catch {
      // refresh on failure
      fetchCount();
    }
  };

  const formatDate = (s?: string) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#A799B7]">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col border-l-0 text-white [&>button]:text-white"
        style={{ backgroundColor: '#A799B7' }}
      >
        <SheetHeader className="px-5 py-4 border-b border-white/20">
          <SheetTitle className="text-white">Notificaciones</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/70">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-white/70">
              No tienes notificaciones
            </div>
          ) : (
            <ul className="divide-y divide-white/15">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    className={cn(
                      "w-full text-left px-5 py-4 transition-colors hover:bg-white/10",
                      !n.is_read && "bg-white/15"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!n.is_read && (
                        <span className="mt-2 w-2 h-2 rounded-full bg-white shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm truncate text-white",
                              n.is_read ? "font-normal text-white/80" : "font-semibold"
                            )}
                          >
                            {n.title || "Notificación"}
                          </p>
                          <span className="text-xs text-white/60 shrink-0">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                        {n.content && (
                          <p className="mt-1 text-sm text-white/75 line-clamp-3">
                            {n.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-white/20">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => fetchPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-white/30 text-white hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-xs text-white/70">
              Página {page} de {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => fetchPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-white/30 text-white hover:bg-white/10 disabled:opacity-40"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsBell;
