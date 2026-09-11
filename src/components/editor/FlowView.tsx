"use client";

import { useEffect, useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createPortal } from "react-dom";
import type { FormField, FieldCondition } from "@/types/database.types";

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H = 100;
const END_H  = 44;

// ─── Type meta ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  short_text:      { icon: "T",  label: "Texto",        color: "#60a5fa" },
  long_text:       { icon: "¶",  label: "Texto longo",  color: "#a78bfa" },
  email:           { icon: "@",  label: "Email",        color: "#fb923c" },
  phone:           { icon: "☎",  label: "Telefone",     color: "#2dd4bf" },
  number:          { icon: "#",  label: "Número",       color: "#4ade80" },
  date:            { icon: "📅", label: "Data",         color: "#22d3ee" },
  multiple_choice: { icon: "☑",  label: "Múltipla",    color: "#f472b6" },
  yes_no:          { icon: "?",  label: "Sim / Não",    color: "#facc15" },
  rating:          { icon: "★",  label: "Avaliação",    color: "#fbbf24" },
  statement:       { icon: "✦",  label: "Declaração",   color: "#818cf8" },
};

// ─── Condition label ───────────────────────────────────────────────────────────
function condLabel(cond: FieldCondition, fields: FormField[]): string {
  const op = { equals: "=", not_equals: "≠", contains: "⊃" }[cond.operator] ?? "=";
  const vals = cond.value.split(",").map(v => v.trim()).filter(Boolean);
  const valStr = vals.length > 2 ? `${vals.slice(0, 2).join(", ")}…` : vals.join(" ou ");
  const src = fields.find(f => f.id === cond.fieldId);
  const srcLabel = src ? src.label.slice(0, 14) + (src.label.length > 14 ? "…" : "") : "";
  return srcLabel ? `${srcLabel}\n${op} ${valStr}` : `${op} ${valStr}`;
}

// ─── Field Node ────────────────────────────────────────────────────────────────
function FieldNode({ data }: { data: Record<string, unknown> }) {
  const field    = data.field as FormField;
  const index    = data.index as number;
  const selected = data.selected as boolean;
  const meta     = TYPE_META[field.type] ?? { icon: "?", label: field.type, color: "#94a3b8" };
  const isStmt   = field.type === "statement";
  const condCount = field.conditions?.length ?? 0;

  return (
    <div style={{
      width: NODE_W,
      background: selected
        ? `linear-gradient(135deg, rgba(125,131,189,0.2) 0%, rgba(125,131,189,0.09) 100%)`
        : isStmt
        ? "rgba(255,255,255,0.025)"
        : "linear-gradient(135deg, rgba(20,20,35,0.98) 0%, rgba(14,14,24,0.98) 100%)",
      borderRadius: 16,
      border: `1px solid ${selected ? "rgba(125,131,189,0.55)" : "rgba(255,255,255,0.07)"}`,
      boxShadow: selected
        ? `0 0 0 3px rgba(125,131,189,0.18), 0 8px 32px rgba(0,0,0,0.5)`
        : "0 4px 24px rgba(0,0,0,0.5)",
      overflow: "hidden",
      cursor: "pointer",
      transition: "box-shadow 0.15s, border-color 0.15s",
      userSelect: "none",
    }}>
      {/* Top color strip */}
      <div style={{
        height: 3,
        background: isStmt
          ? "rgba(255,255,255,0.05)"
          : `linear-gradient(90deg, ${meta.color}CC 0%, ${meta.color}33 100%)`,
      }} />

      <div style={{ padding: "10px 14px 12px" }}>
        {/* Type row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 7,
              background: `${meta.color}18`,
              border: `1px solid ${meta.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: meta.color, flexShrink: 0,
            }}>
              {meta.icon}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: `${meta.color}BB`, letterSpacing: "0.04em" }}>
              {meta.label}
            </span>
            {field.isMqlField && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: "0.07em",
                color: "#7D83BD", background: "rgba(125,131,189,0.15)",
                border: "1px solid rgba(125,131,189,0.2)",
                padding: "1px 5px", borderRadius: 4,
              }}>MQL</span>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.12)", fontVariantNumeric: "tabular-nums" }}>
            {index + 1}
          </span>
        </div>

        {/* Label */}
        <p style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.35,
          color: isStmt ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.88)",
          margin: 0, marginBottom: condCount > 0 ? 8 : 0,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>
          {field.label}
        </p>

        {/* Conditions pill */}
        {condCount > 0 && (
          <span style={{
            fontSize: 9.5, fontWeight: 600,
            color: "rgba(125,131,189,0.6)",
            background: "rgba(125,131,189,0.08)",
            border: "1px solid rgba(125,131,189,0.12)",
            padding: "2px 8px", borderRadius: 20,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 8 }}>◆</span>
            {condCount} {condCount === 1 ? "regra" : "regras"}
          </span>
        )}
      </div>

      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: selected ? "#7D83BD" : "rgba(125,131,189,0.5)", border: "2px solid #0e0e1a", top: -5 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: selected ? "#7D83BD" : "rgba(125,131,189,0.5)", border: "2px solid #0e0e1a", bottom: -5 }} />
    </div>
  );
}

// ─── End Node ──────────────────────────────────────────────────────────────────
function EndNode({ data }: { data: Record<string, unknown> }) {
  const type    = data.type as "submit" | "disqualify";
  const isSubmit = type === "submit";
  const color   = isSubmit ? "#22c55e" : "#ef4444";
  const icon    = isSubmit ? "✓" : "✕";
  const label   = isSubmit ? "Formulário enviado" : "Lead desqualificado";

  return (
    <div style={{
      width: NODE_W, height: END_H,
      background: `linear-gradient(135deg, ${color}10, ${color}05)`,
      border: `1px solid ${color}28`,
      borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      boxShadow: `0 0 24px ${color}12, 0 4px 16px rgba(0,0,0,0.3)`,
    }}>
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: color, border: "2px solid #0e0e1a", top: -5 }} />
      <span style={{
        width: 24, height: 24, borderRadius: 8,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color,
      }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: `${color}CC`, letterSpacing: "0.02em" }}>
        {label}
      </span>
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  fieldNode: FieldNode as unknown as NodeTypes[string],
  endNode: EndNode as unknown as NodeTypes[string],
};

// ─── Graph builder ─────────────────────────────────────────────────────────────
function buildGraph(fields: FormField[], selectedId: string | null): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();
  const addEdge = (e: Edge) => { if (!edgeSet.has(e.id)) { edgeSet.add(e.id); edges.push(e); } };

  const needsDisq = fields.some(f => f.conditions?.some(c => c.jumpTo === "disqualify"));

  fields.forEach((field, idx) => {
    nodes.push({
      id: field.id, type: "fieldNode",
      data: { field, index: idx, selected: field.id === selectedId },
      position: { x: 0, y: idx * 160 },
      draggable: true,
    });

    const hasConds = (field.conditions?.length ?? 0) > 0;
    const nextId = idx < fields.length - 1 ? fields[idx + 1].id : "submit";

    // Default sequential edge
    addEdge({
      id: `seq-${field.id}`,
      source: field.id, target: nextId,
      type: "smoothstep",
      animated: false,
      style: {
        stroke: hasConds ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)",
        strokeWidth: 1.5,
        strokeDasharray: hasConds ? "5,5" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: hasConds ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)", width: 14, height: 14 },
    });

    // Conditional edges
    field.conditions?.forEach((cond, ci) => {
      const targetId = cond.jumpTo === "submit" ? "submit" : cond.jumpTo === "disqualify" ? "disqualify" : cond.jumpTo;
      const exists = targetId === "submit" || targetId === "disqualify" || fields.some(f => f.id === targetId);
      if (!exists) return;

      const isDisq = cond.jumpTo === "disqualify";
      const isSub  = cond.jumpTo === "submit";
      const color  = isDisq ? "#f87171" : isSub ? "#4ade80" : "#7D83BD";

      addEdge({
        id: `cond-${field.id}-${ci}`,
        source: field.id, target: targetId,
        type: "smoothstep", animated: true,
        label: condLabel(cond, fields),
        labelStyle: { fontSize: 9.5, fill: color, fontWeight: 600 },
        labelBgStyle: { fill: "#0e0e1a", fillOpacity: 0.95 },
        labelBgPadding: [5, 4] as [number, number],
        labelBgBorderRadius: 6,
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
      });
    });
  });

  nodes.push({ id: "submit", type: "endNode", data: { type: "submit" }, position: { x: 0, y: fields.length * 160 }, draggable: true });
  if (needsDisq) {
    nodes.push({ id: "disqualify", type: "endNode", data: { type: "disqualify" }, position: { x: NODE_W + 80, y: fields.length * 160 }, draggable: true });
  }

  return { nodes, edges };
}

// ─── Dagre layout ──────────────────────────────────────────────────────────────
async function applyLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const dagre = await import("@dagrejs/dagre");
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 70, marginx: 60, marginy: 60 });
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: n.type === "endNode" ? END_H : NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    const h = n.type === "endNode" ? END_H : NODE_H;
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - h / 2 } };
  });
}

// ─── Custom Controls ───────────────────────────────────────────────────────────
function CustomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, transition: "color 0.1s, background 0.1s",
  };
  const [hover, setHover] = useState<string | null>(null);
  const hoverStyle = { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" };

  return (
    <div style={{
      position: "absolute", left: 16, bottom: 80,
      background: "rgba(10,10,20,0.88)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 4,
      display: "flex", flexDirection: "column", gap: 2,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      zIndex: 5,
    }}>
      {[
        { id: "in",  icon: "+",    action: () => zoomIn(),         title: "Aproximar" },
        { id: "out", icon: "−",    action: () => zoomOut(),        title: "Afastar" },
        { id: "fit", icon: "⤢",  action: () => fitView({ padding: 0.3 }), title: "Ajustar" },
      ].map(b => (
        <button
          key={b.id}
          onClick={b.action}
          title={b.title}
          onMouseEnter={() => setHover(b.id)}
          onMouseLeave={() => setHover(null)}
          style={{ ...btnStyle, ...(hover === b.id ? hoverStyle : {}) }}
        >
          {b.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Field Detail Modal ────────────────────────────────────────────────────────
function FieldModal({
  field,
  fields,
  onClose,
  onEdit,
}: {
  field: FormField;
  fields: FormField[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const meta = TYPE_META[field.type] ?? { icon: "?", label: field.type, color: "#94a3b8" };
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const jumpLabel = (jumpTo: string) => {
    if (jumpTo === "submit") return "✓ Enviar formulário";
    if (jumpTo === "disqualify") return "✕ Desqualificar lead";
    const f = fields.find(f => f.id === jumpTo);
    return f ? `→ ${f.label.slice(0, 30)}` : jumpTo;
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        width: 400, maxWidth: "90vw",
        background: "linear-gradient(160deg, #12121f 0%, #0c0c18 100%)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden",
        animation: "slideUp 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Top color strip */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${meta.color}DD 0%, ${meta.color}44 100%)`,
        }} />

        <div style={{ padding: "20px 22px 22px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${meta.color}18`,
                border: `1px solid ${meta.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: meta.color, flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: `${meta.color}99`, letterSpacing: "0.05em", marginBottom: 2 }}>
                  {meta.label}{field.isMqlField ? " · MQL" : ""}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.92)", lineHeight: 1.25 }}>
                  {field.label}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
              }}
            >✕</button>
          </div>

          {/* Options */}
          {field.options && field.options.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 7, textTransform: "uppercase" }}>
                Opções
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {field.options.map(opt => (
                  <span key={opt} style={{
                    fontSize: 11, color: "rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: "3px 9px", borderRadius: 20,
                  }}>{opt}</span>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {(field.conditions?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 7, textTransform: "uppercase" }}>
                Regras condicionais
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {field.conditions!.map((cond, i) => {
                  const src = fields.find(f => f.id === cond.fieldId);
                  const op = { equals: "=", not_equals: "≠", contains: "⊃" }[cond.operator] ?? "=";
                  const vals = cond.value.split(",").map(v => v.trim()).filter(Boolean).join(", ");
                  const isDisq = cond.jumpTo === "disqualify";
                  const isSub  = cond.jumpTo === "submit";
                  const color  = isDisq ? "#f87171" : isSub ? "#4ade80" : "#7D83BD";
                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: `2px solid ${color}`,
                      borderRadius: 8, padding: "8px 10px",
                      fontSize: 11.5,
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>
                        {src?.label ?? "Campo"} {op}{" "}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                        {vals}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}> → </span>
                      <span style={{ color, fontWeight: 600 }}>{jumpLabel(cond.jumpTo)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <button
            onClick={onEdit}
            style={{
              width: "100%", padding: "10px",
              background: "rgba(125,131,189,0.12)",
              border: "1px solid rgba(125,131,189,0.2)",
              borderRadius: 10,
              color: "#7D83BD", fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", transition: "background 0.15s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(125,131,189,0.2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(125,131,189,0.12)")}
          >
            ✎  Editar campo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
      `}</style>
    </>,
    document.body
  );
}

// ─── Inner ─────────────────────────────────────────────────────────────────────
function FlowInner({
  fields,
  selectedId,
  onSelectField,
}: {
  fields: FormField[];
  selectedId: string | null;
  onSelectField: (id: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [modalField, setModalField] = useState<FormField | null>(null);

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(fields, selectedId);
    applyLayout(n, e).then(layouted => {
      setNodes(layouted);
      setEdges(e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedId]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "fieldNode") {
        const field = fields.find(f => f.id === node.id);
        if (field) setModalField(field);
      }
    },
    [fields]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#07070f" }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgba(255,255,255,0.035)" />
        <CustomControls />
      </ReactFlow>

      {/* Legend */}
      {fields.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 18, alignItems: "center",
          background: "rgba(7,7,15,0.88)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20, padding: "7px 18px",
          pointerEvents: "none", zIndex: 5,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {([
            { color: "rgba(255,255,255,0.15)", dash: true,  label: "Fluxo padrão" },
            { color: "#7D83BD",                dash: false, label: "Regra condicional" },
            { color: "#4ade80",                dash: false, label: "Enviar" },
            { color: "#f87171",                dash: false, label: "Desqualificar" },
          ] as const).map(({ color, dash, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="22" height="8" style={{ overflow: "visible" }}>
                <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray={dash ? "4,3" : undefined} />
                <polygon points="20,1 20,7 26,4" fill={color} />
              </svg>
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.32)", fontWeight: 500, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {fields.length === 0 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 12, pointerEvents: "none",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "rgba(125,131,189,0.08)",
            border: "1px solid rgba(125,131,189,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>◆</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontWeight: 500 }}>
            Adicione perguntas para ver o fluxo
          </p>
        </div>
      )}

      {/* Field detail modal */}
      {modalField && (
        <FieldModal
          field={modalField}
          fields={fields}
          onClose={() => setModalField(null)}
          onEdit={() => {
            onSelectField(modalField.id);
            setModalField(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────
export function FlowView({
  fields,
  selectedId,
  onSelectField,
}: {
  fields: FormField[];
  selectedId: string | null;
  onSelectField: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <FlowInner fields={fields} selectedId={selectedId} onSelectField={onSelectField} />
    </ReactFlowProvider>
  );
}
