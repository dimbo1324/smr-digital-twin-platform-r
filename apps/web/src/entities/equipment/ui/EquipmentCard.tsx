import type { LucideIcon } from "lucide-react";
import { Box, Cpu, Factory, Gauge, SlidersHorizontal } from "lucide-react";
import type { Equipment, EquipmentStatus } from "@/entities/equipment/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const statusVariant: Record<
  EquipmentStatus,
  "outline" | "default" | "warning" | "success"
> = {
  offline: "outline",
  mock: "default",
  warning: "warning",
  normal: "success",
};

const equipmentIcon: Record<Equipment["type"], LucideIcon> = {
  tank: Box,
  pump: Gauge,
  valve: SlidersHorizontal,
  "heat-exchanger": Factory,
  sensor: Gauge,
  controller: Cpu,
};

export interface EquipmentCardProps {
  equipment: Equipment;
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const Icon = equipmentIcon[equipment.type];

  return (
    <Card className="transition-colors hover:border-white/20">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-2 text-cyan-200">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-sm">{equipment.tag}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{equipment.name}</p>
          </div>
        </div>
        <Badge variant={statusVariant[equipment.status]}>{equipment.status}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-zinc-300">{equipment.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{equipment.location}</p>
      </CardContent>
    </Card>
  );
}
