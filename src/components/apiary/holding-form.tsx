import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/apiary/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nowIso, useAppMutations, useNotebook, type HoldingClass, type HoldingMode } from "@/lib/apiary";

const NONE = "__none";

export function HoldingCard() {
  const { data } = useNotebook();
  const { saveHolding } = useAppMutations();
  const holding = data.holding;
  const [ownerName, setOwnerName] = useState("");
  const [nif, setNif] = useState("");
  const [rega, setRega] = useState("");
  const [mode, setMode] = useState<string>(NONE);
  const [holdingClass, setHoldingClass] = useState<string>(NONE);

  useEffect(() => {
    setOwnerName(holding?.ownerName ?? "");
    setNif(holding?.nif ?? "");
    setRega(holding?.rega ?? "");
    setMode(holding?.mode ?? NONE);
    setHoldingClass(holding?.holdingClass ?? NONE);
  }, [holding]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await saveHolding.mutateAsync({
      ownerName: ownerName.trim() || undefined,
      nif: nif.trim() || undefined,
      rega: rega.trim() || undefined,
      mode: mode === NONE ? undefined : (mode as HoldingMode),
      holdingClass: holdingClass === NONE ? undefined : (holdingClass as HoldingClass),
      updatedAt: nowIso(),
    });
    toast.success("Ficha guardada en este dispositivo");
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-medium">Ficha de la explotación</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Opcional. Sirve para tener a mano el REGA y el tipo de explotación. No se envía a ningún sitio.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Titular" htmlFor="holding-owner">
          <Input id="holding-owner" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
        </Field>
        <Field label="NIF" htmlFor="holding-nif">
          <Input id="holding-nif" value={nif} onChange={(event) => setNif(event.target.value)} />
        </Field>
        <Field label="REGA" htmlFor="holding-rega">
          <Input id="holding-rega" value={rega} onChange={(event) => setRega(event.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin indicar</SelectItem>
              <SelectItem value="stationary">Estante</SelectItem>
              <SelectItem value="migratory">Trashumante</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Clase">
          <Select value={holdingClass} onValueChange={setHoldingClass}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin indicar</SelectItem>
              <SelectItem value="PD">Producción</SelectItem>
              <SelectItem value="SC">Selección y cría</SelectItem>
              <SelectItem value="PZ">Polinización</SelectItem>
              <SelectItem value="MX">Mixta</SelectItem>
              <SelectItem value="OT">Otra</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={saveHolding.isPending}>
            Guardar ficha
          </Button>
        </div>
      </form>
    </Card>
  );
}
