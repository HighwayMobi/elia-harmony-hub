import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Footprints, Trash2, Flame, Timer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityTrackerProps {
  user: User;
}

const ACTIVITY_TYPES = [
  { value: "walking", label: "Caminar" },
  { value: "running", label: "Correr" },
  { value: "cycling", label: "Ciclismo" },
  { value: "swimming", label: "Natación" },
  { value: "yoga", label: "Yoga" },
  { value: "gym", label: "Gimnasio" },
  { value: "other", label: "Otro" },
];

const ActivityTracker = ({ user }: ActivityTrackerProps) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activityType, setActivityType] = useState("walking");
  const [startTime, setStartTime] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [steps, setSteps] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");

  const { data: records, isLoading } = useQuery({
    queryKey: ["activity_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_records")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activity_records").insert({
        user_id: user.id,
        activity_type: activityType,
        start_time: new Date(startTime).toISOString(),
        duration_minutes: durationMin ? parseInt(durationMin) : null,
        steps: steps ? parseInt(steps) : null,
        calories_burned: calories ? parseInt(calories) : null,
        notes: notes || null,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_records"] });
      toast.success("Actividad registrada");
      setShowForm(false);
      setActivityType("walking");
      setStartTime("");
      setDurationMin("");
      setSteps("");
      setCalories("");
      setNotes("");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_records"] });
      toast.success("Registro eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const getActivityLabel = (type: string) =>
    ACTIVITY_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="mt-4 space-y-4">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-white hover:bg-[#F5E6D3]/15 text-[#2F2A33] border-0 h-12 rounded-2xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar actividad
        </Button>
      ) : (
        <div className="bg-white backdrop-blur-sm rounded-2xl p-5 space-y-4">
          <h3 className="text-[#2F2A33] font-medium flex items-center gap-2">
            <Footprints className="w-4 h-4" /> Nueva actividad
          </h3>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Tipo de actividad</label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="bg-white border-[#F5E6D3]/20 text-[#2F2A33]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Fecha y hora</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-white border-[#F5E6D3]/20 text-[#2F2A33]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[#2F2A33]/60 text-xs">Duración (min)</label>
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="30"
                className="bg-white border-[#F5E6D3]/20 text-[#2F2A33] placeholder:text-[#2F2A33]/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#2F2A33]/60 text-xs">Pasos</label>
              <Input
                type="number"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="0"
                className="bg-white border-[#F5E6D3]/20 text-[#2F2A33] placeholder:text-[#2F2A33]/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Calorías (opcional)</label>
            <Input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="0"
              className="bg-white border-[#F5E6D3]/20 text-[#2F2A33] placeholder:text-[#2F2A33]/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#2F2A33]/60 text-xs">Notas (opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles de la actividad"
              className="bg-white border-[#F5E6D3]/20 text-[#2F2A33] placeholder:text-[#2F2A33]/40"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(false)}
              variant="ghost"
              className="flex-1 text-[#2F2A33]/60 hover:text-[#F5E6D3] hover:bg-[#F5E6D3]/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!startTime || !activityType || addMutation.isPending}
              className="flex-1 bg-[#F5E6D3]/10 hover:bg-[#F5E6D3]/20 text-[#2F2A33] border-0"
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
          {records.map((r) => (
            <div key={r.id} className="bg-white backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[#2F2A33] text-sm font-medium">
                  {getActivityLabel(r.activity_type)}
                </p>
                <p className="text-[#2F2A33]/50 text-xs">
                  {format(new Date(r.start_time), "d MMM yyyy, HH:mm", { locale: es })}
                </p>
                <div className="flex gap-3 mt-1 text-[#2F2A33]/50 text-xs">
                  {r.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {r.duration_minutes}min
                    </span>
                  )}
                  {r.steps && (
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3" />
                      {r.steps.toLocaleString()}
                    </span>
                  )}
                  {r.calories_burned && (
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {r.calories_burned}cal
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                className="text-[#2F2A33]/30 hover:text-[#2F2A33]/80 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[#2F2A33]/40 text-center text-sm py-8">
          No hay registros de actividad
        </p>
      )}
    </div>
  );
};

export default ActivityTracker;
