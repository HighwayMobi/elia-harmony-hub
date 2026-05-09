import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Moon, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SleepTrackerProps {
  user: User;
}

const SleepTracker = ({ user }: SleepTrackerProps) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState("");

  const { data: records, isLoading } = useQuery({
    queryKey: ["sleep_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_records")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

      const { error } = await supabase.from("sleep_records").insert({
        user_id: user.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: durationMin > 0 ? durationMin : null,
        quality_rating: quality,
        notes: notes || null,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep_records"] });
      toast.success("Registro de sueño guardado");
      setShowForm(false);
      setStartTime("");
      setEndTime("");
      setQuality(3);
      setNotes("");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sleep_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep_records"] });
      toast.success("Registro eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  return (
    <div className="mt-4 space-y-4">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-white hover:bg-[#A36BFF]/15 text-[#2F2A33] border-0 h-12 rounded-2xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar sueño
        </Button>
      ) : (
        <div className="bg-white backdrop-blur-sm rounded-2xl p-5 space-y-4">
          <h3 className="text-[#2F2A33] font-medium flex items-center gap-2">
            <Moon className="w-4 h-4" /> Nuevo registro
          </h3>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Hora de dormir</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-white border-[#A36BFF]/20 text-[#2F2A33]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Hora de despertar</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-white border-[#A36BFF]/20 text-[#2F2A33]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Calidad (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setQuality(v)}
                  className="p-1"
                >
                  <Star
                    className={`w-6 h-6 ${v <= quality ? "text-yellow-300 fill-yellow-300" : "text-[#2F2A33]/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Notas (opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Cómo dormiste?"
              className="bg-white border-[#A36BFF]/20 text-[#2F2A33] placeholder:text-[#2F2A33]/40"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(false)}
              variant="ghost"
              className="flex-1 text-[#2F2A33]/60 hover:text-[#A36BFF] hover:bg-[#A36BFF]/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!startTime || !endTime || addMutation.isPending}
              className="flex-1 bg-[#A36BFF]/10 hover:bg-[#A36BFF]/20 text-[#2F2A33] border-0"
            >
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Records list */}
      {isLoading ? (
        <p className="text-[#2F2A33]/40 text-center text-sm">Cargando...</p>
      ) : records && records.length > 0 ? (
        <div className="space-y-3">
          {records.map((r) => {
            const hours = r.duration_minutes ? Math.floor(r.duration_minutes / 60) : 0;
            const mins = r.duration_minutes ? r.duration_minutes % 60 : 0;
            return (
              <div key={r.id} className="bg-white backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[#2F2A33] text-sm font-medium">
                    {hours}h {mins}m
                  </p>
                  <p className="text-[#2F2A33]/50 text-xs">
                    {format(new Date(r.start_time), "d MMM yyyy", { locale: es })}
                  </p>
                  {r.quality_rating && (
                    <div className="flex mt-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Star
                          key={v}
                          className={`w-3 h-3 ${v <= r.quality_rating! ? "text-yellow-300 fill-yellow-300" : "text-[#2F2A33]/20"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(r.id)}
                  className="text-[#2F2A33]/30 hover:text-[#2F2A33]/80 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[#2F2A33]/40 text-center text-sm py-8">
          No hay registros de sueño
        </p>
      )}
    </div>
  );
};

export default SleepTracker;
