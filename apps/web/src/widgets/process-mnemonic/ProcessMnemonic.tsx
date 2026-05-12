import { ArrowRight } from "lucide-react";
import type { ProcessEdge, ProcessNode, ProcessTopology } from "@/entities/process/model/types";
import { ProcessNodeCard } from "@/widgets/process-mnemonic/ProcessNodeCard";
import { ProcessStatusBadge } from "@/widgets/process-mnemonic/ProcessStatusBadge";
import { cn } from "@/shared/lib/cn";

export function ProcessMnemonic({
  topology,
  selectedNodeId,
  onSelectNode,
}: {
  topology: ProcessTopology;
  selectedNodeId?: string;
  onSelectNode: (node: ProcessNode) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border/70 bg-surface-subtle/70 p-4">
      <div className="relative h-[660px] min-w-[1320px]">
        <svg className="absolute inset-0 h-full w-full" role="img" aria-label="Process topology flow">
          <defs>
            <marker id="process-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>
          {topology.edges.map((edge) => (
            <ProcessEdgeLine
              key={edge.id}
              edge={edge}
              source={topology.nodes.find((node) => node.id === edge.source)}
              target={topology.nodes.find((node) => node.id === edge.target)}
            />
          ))}
        </svg>

        {topology.edges.map((edge) => (
          <ProcessEdgeLabel
            key={edge.id}
            edge={edge}
            source={topology.nodes.find((node) => node.id === edge.source)}
            target={topology.nodes.find((node) => node.id === edge.target)}
          />
        ))}

        {topology.nodes.map((node) => (
          <ProcessNodeCard
            key={node.id}
            node={node}
            selected={node.id === selectedNodeId}
            onSelect={onSelectNode}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessEdgeLine({
  edge,
  source,
  target,
}: {
  edge: ProcessEdge;
  source?: ProcessNode;
  target?: ProcessNode;
}) {
  if (!source || !target) {
    return null;
  }
  const start = nodeCenter(source);
  const end = nodeCenter(target);
  const midX = (start.x + end.x) / 2;
  const path =
    Math.abs(start.y - end.y) < 90
      ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      : `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;

  return (
    <g className={edgeClass(edge.status)}>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray={edge.flowType === "protection-signal" ? "6 6" : undefined}
        markerEnd="url(#process-arrow)"
        opacity="0.78"
      />
      {edge.animated ? (
        <circle r="4" fill="currentColor">
          <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
    </g>
  );
}

function ProcessEdgeLabel({
  edge,
  source,
  target,
}: {
  edge: ProcessEdge;
  source?: ProcessNode;
  target?: ProcessNode;
}) {
  if (!source || !target) {
    return null;
  }
  const start = nodeCenter(source);
  const end = nodeCenter(target);
  return (
    <div
      className="absolute z-0 flex items-center gap-1 rounded-full border border-border/70 bg-card/90 px-2.5 py-1 text-[0.7rem] text-muted-foreground shadow-panel"
      style={{
        left: (start.x + end.x) / 2 - 64,
        top: (start.y + end.y) / 2 - 14,
      }}
    >
      <ArrowRight className="h-3 w-3 text-primary" aria-hidden="true" />
      <span className="max-w-[130px] truncate">{edge.label}</span>
      <ProcessStatusBadge status={edge.status} />
    </div>
  );
}

function nodeCenter(node: ProcessNode) {
  return {
    x: node.position.x + 95,
    y: node.position.y + 86,
  };
}

function edgeClass(status: ProcessEdge["status"]) {
  return cn(
    status === "OK" && "text-success",
    status === "WARNING" && "text-warning",
    (status === "ALARM" || status === "TRIP") && "text-danger",
    (status === "DEGRADED" || status === "UNKNOWN" || status === "OFFLINE") &&
      "text-offline",
  );
}
