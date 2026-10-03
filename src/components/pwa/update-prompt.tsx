import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { backupAgeDays } from "@/lib/apiary/backup-stamp";
import { useNotebook } from "@/lib/apiary";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast("Hay una versión nueva de Apiario", {
      duration: Infinity,
      action: {
        label: "Actualizar",
        onClick: () => void updateServiceWorker(true),
      },
      cancel: {
        label: "Luego",
        onClick: () => setNeedRefresh(false),
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export function BackupReminder() {
  const { data } = useNotebook();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (data.apiaries.length === 0 && data.colonies.length === 0) return;
    if (sessionStorage.getItem("apiario:backup-nagged") === "1") return;
    const age = backupAgeDays();
    if (age !== null && age < 21) return;
    sessionStorage.setItem("apiario:backup-nagged", "1");
    toast.message(
      age === null
        ? "Este cuaderno solo vive en este teléfono. Descarga una copia JSON."
        : "Hace más de tres semanas de la última copia. Descárgala de nuevo.",
    );
  }, [data.apiaries.length, data.colonies.length]);

  return null;
}
