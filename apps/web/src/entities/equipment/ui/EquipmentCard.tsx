import type { LucideIcon } from "lucide-react";
import { Box, Cpu, Factory, Gauge, SlidersHorizontal } from "lucide-react";
import type { Equipment, EquipmentStatus } from "@/entities/equipment/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const statusVariant: Record<
  EquipmentStatus,
  "offline" | "mock" | "warning" | "success"
> = {
  offline: "offline",
  mock: "mock",
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
    <Card className="transition-colors">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border/70 bg-primary/10 p-2.5 text-primary">
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
        <p className="text-sm leading-6 text-foreground/80">{equipment.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{equipment.location}</p>
      </CardContent>
    </Card>
  );
}
