"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
  type Connection,
  type NodeTypes,
  type OnConnect,
  type OnEdgesDelete,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createPortal } from "react-dom";
import type { FormField, FieldType, FieldCondition } from "@/types/database.types";
import { FieldConfig } from "./FieldConfig";

// ─── Helpers ────────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10);

const FIELD_LABELS: Record<FieldType, string> = {
  short_text:      "Pergunta de texto",
  long_text:       "Texto longo",
  email:           "Endereço de email",
  phone:           "Telefone",
  number:          "Número",
  date:            "Data",
  multiple_choice: "Múltipla escolha",
  yes_no:          "Sim ou não?",
  rating:          "Como você avalia?",
  statement:       "Texto de apresentação",
};

function makeField(type: FieldType): FormField {
  return {
    id: genId(),
    type,
    label: FIELD_LABELS[type],
    required: type !== "statement",
    placeholder: "",
    options: type === "multiple_choice" ? ["Opção 1", "Opção 2", "Opção 3"] : undefined,
    scale: type === "rating" ? 5 : undefined,
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 252;
const NODE_H = 122;
const END_H  = 48;

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

const SIDEBAR_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: "Texto",    types: ["short_text", "long_text", "number", "date"] },
  { label: "Contato",  types: ["email", "phone"] },
  { label: "Escolha",  types: ["multiple_choice", "yes_no", "rating"] },
  { label: "Extra",    types: ["statement"] },
];

// ─── Condition label (for edge labels) ────────────────────────────────────────
function condLabel(cond: FieldCondition, fields: FormField[]): string {
  const op = { equals: "=", not_equals: "≠", contains: "⊃" }[cond.operator] ?? "=";
  const vals = cond.value.split(",").map(v => v.trim()).filter(Boolean);
  const valStr = vals.length > 2 ? `${vals.slice(0, 2).join(", ")}…` : vals.join(" ou ");
  const src = fields.find(f => f.id === cond.fieldId);
  const srcLabel = src ? src.label.slice(0, 14) + (src.label.length > 14 ? "…" : "") : "";
  return srcLabel ? `${srcLabel}\n${op} ${valStr}` : `${op} ${valStr}`;
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function FlowSidebar() {
  const onDragStart = (e: React.DragEvent, type: FieldType) => {
    e.dataTransfer.setData("application/donforms-field", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div style={{
      width: 172, flexShrink: 0, height: "100%",
      background: "rgba(5,5,12,0.97)",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column",
      padding: "14px 9px 20px", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ paddingLeft: 8, marginBottom: 14 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.2)", textTransform: "uppercase", margin: 0,
        }}>Campos</p>
      </div>

      {/* Groups */}
      {SIDEBAR_GROUPS.map((group, gi) => (
        <div key={group.label} style={{ marginBottom: gi < SIDEBAR_GROUPS.length - 1 ? 16 : 0 }}>
          <p style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.18)", textTransform: "uppercase",
            paddingLeft: 8, marginBottom: 6, margin: "0 0 6px",
          }}>{group.label}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.types.map(type => {
              const meta = TYPE_META[type];
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={e => onDragStart(e, type)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 11,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    cursor: "grab", userSelect: "none",
                    transition: "all 0.14s cubic-bezier(0.22,1,0.36,1)",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = `${meta.color}14`;
                    el.style.borderColor = `${meta.color}35`;
                    el.style.transform = "translateX(3px)";
                    el.style.boxShadow = `0 2px 12px rgba(0,0,0,0.3)`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(255,255,255,0.025)";
                    el.style.borderColor = "rgba(255,255,255,0.05)";
                    el.style.transform = "translateX(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                    background: `linear-gradient(135deg, ${meta.color}22 0%, ${meta.color}0d 100%)`,
                    border: `1px solid ${meta.color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: meta.color,
                    boxShadow: `0 0 10px ${meta.color}1a`,
                  }}>
                    {meta.icon}
                  </div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Drag hint */}
      <div style={{
        marginTop: "auto", paddingTop: 16,
        display: "flex", alignItems: "center", gap: 5, paddingLeft: 8,
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="3" cy="3" r="1" fill="rgba(255,255,255,0.18)"/>
          <circle cx="7" cy="3" r="1" fill="rgba(255,255,255,0.18)"/>
          <circle cx="3" cy="7" r="1" fill="rgba(255,255,255,0.18)"/>
          <circle cx="7" cy="7" r="1" fill="rgba(255,255,255,0.18)"/>
        </svg>
        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.18)", fontWeight: 500 }}>
          Arraste para o canvas
        </span>
      </div>
    </div>
  );
}

// ─── Field Node ────────────────────────────────────────────────────────────────
function FieldNode({ data }: { data: Record<string, unknown> }) {
  const field    = data.field as FormField;
  const index    = data.index as number;
  const selected = data.selected as boolean;
  const meta     = TYPE_META[field.type] ?? { icon: "?", label: field.type, color: "#94a3b8" };
  const isStmt   = field.type === "statement";
  const condCount = field.conditions?.length ?? 0;
  const indexStr = String(index + 1).padStart(2, "0");

  return (
    <div
      style={{
        width: NODE_W,
        background: selected
          ? `linear-gradient(160deg, rgba(108,99,255,0.16) 0%, rgba(10,10,22,0.98) 100%)`
          : isStmt
          ? "rgba(14,14,26,0.97)"
          : "rgba(10,10,22,0.98)",
        borderRadius: 18,
        border: `1px solid ${
          selected
            ? "rgba(108,99,255,0.35)"
            : "rgba(255,255,255,0.05)"
        }`,
        boxShadow: selected
          ? `0 0 0 2px rgba(108,99,255,0.15), 0 10px 36px rgba(0,0,0,0.6)`
          : `0 4px 20px rgba(0,0,0,0.5)`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
        userSelect: "none",
        position: "relative",
      }}
      onMouseEnter={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 28px rgba(0,0,0,0.55)`;
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.10)";
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.5)`;
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.05)";
        }
      }}
    >
      {/* Top colored bar — gradient fade */}
      <div style={{
        height: 3,
        background: isStmt
          ? "rgba(255,255,255,0.05)"
          : `linear-gradient(90deg, ${meta.color}EE 0%, ${meta.color}55 50%, transparent 100%)`,
      }} />

      {/* Card body */}
      <div style={{ padding: "12px 14px 13px" }}>
        {/* Row 1: icon + type badge + index */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            {/* Icon pill */}
            <div style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${meta.color}28 0%, ${meta.color}10 100%)`,
              border: `1px solid ${meta.color}45`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: meta.color,
              boxShadow: `0 0 14px ${meta.color}25`,
            }}>{meta.icon}</div>

            {/* Type label */}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
              color: `${meta.color}CC`,
              background: `${meta.color}14`,
              border: `1px solid ${meta.color}22`,
              padding: "2px 8px", borderRadius: 20,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{meta.label}</span>

            {field.isMqlField && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                color: "#7D83BD", background: "rgba(125,131,189,0.15)",
                border: "1px solid rgba(125,131,189,0.25)", padding: "1px 5px", borderRadius: 4,
              }}>MQL</span>
            )}
          </div>

          {/* Index badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)",
            fontVariantNumeric: "tabular-nums",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            padding: "2px 7px", borderRadius: 20, flexShrink: 0, marginLeft: 6,
          }}>{indexStr}</span>
        </div>

        {/* Field label */}
        <p style={{
          fontSize: 13.5, fontWeight: 600, lineHeight: 1.3,
          color: isStmt ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.92)",
          margin: 0,
          marginBottom: (condCount > 0 || (field.required && !isStmt)) ? 9 : 0,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          letterSpacing: "-0.1px",
        }}>{field.label}</p>

        {/* Bottom row: required + conditions */}
        {(condCount > 0 || (field.required && !isStmt)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {field.required && !isStmt && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.28)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "2px 7px", borderRadius: 20,
              }}>OBRIG.</span>
            )}
            {condCount > 0 && (
              <span style={{
                fontSize: 9.5, fontWeight: 600,
                color: "rgba(125,131,189,0.75)",
                background: "rgba(125,131,189,0.1)",
                border: "1px solid rgba(125,131,189,0.2)",
                padding: "2px 8px", borderRadius: 20,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 7 }}>◆</span>
                {condCount} {condCount === 1 ? "regra" : "regras"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection handles — colored + glowing */}
      <Handle type="target" position={Position.Top}
        style={{
          width: 12, height: 12,
          background: selected ? "#6C63FF" : `${meta.color}`,
          border: "2px solid #08080f",
          top: -6,
          boxShadow: `0 0 10px ${selected ? "rgba(108,99,255,0.7)" : `${meta.color}60`}`,
        }} />
      <Handle type="source" position={Position.Bottom}
        style={{
          width: 12, height: 12,
          background: selected ? "#6C63FF" : `${meta.color}`,
          border: "2px solid #08080f",
          bottom: -6,
          boxShadow: `0 0 10px ${selected ? "rgba(108,99,255,0.7)" : `${meta.color}60`}`,
        }} />
    </div>
  );
}

// ─── End Node ──────────────────────────────────────────────────────────────────
function EndNode({ data }: { data: Record<string, unknown> }) {
  const type     = data.type as "submit" | "disqualify";
  const isSubmit = type === "submit";
  const color    = isSubmit ? "#22c55e" : "#ef4444";
  const icon     = isSubmit ? "✓" : "✕";
  const label    = isSubmit ? "Formulário enviado" : "Desqualificado";

  return (
    <div style={{
      width: NODE_W, height: END_H,
      background: `linear-gradient(135deg, ${color}16 0%, ${color}06 100%)`,
      border: `1px solid ${color}35`, borderRadius: 16,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
      boxShadow: `0 0 20px ${color}14, 0 6px 24px rgba(0,0,0,0.4)`,
    }}>
      <Handle type="target" position={Position.Top}
        style={{
          width: 12, height: 12, background: color,
          border: "2px solid #08080f", top: -6,
          boxShadow: `0 0 10px ${color}60`,
        }} />
      <div style={{
        width: 26, height: 26, borderRadius: 9,
        background: `linear-gradient(135deg, ${color}28 0%, ${color}10 100%)`,
        border: `1px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color,
        boxShadow: `0 0 14px ${color}30`,
      }}>{icon}</div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: `${color}DD`, letterSpacing: "0.01em" }}>{label}</span>
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
  const pushEdge = (e: Edge) => { if (!edgeSet.has(e.id)) { edgeSet.add(e.id); edges.push(e); } };

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

    pushEdge({
      id: `seq-${field.id}`, source: field.id, target: nextId,
      type: "smoothstep", animated: false,
      deletable: false,
      style: {
        stroke: hasConds ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)",
        strokeWidth: 1.5,
        strokeDasharray: hasConds ? "5,5" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: hasConds ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)", width: 14, height: 14 },
    });

    field.conditions?.forEach((cond, ci) => {
      const targetId = cond.jumpTo === "submit" ? "submit" : cond.jumpTo === "disqualify" ? "disqualify" : cond.jumpTo;
      const exists = targetId === "submit" || targetId === "disqualify" || fields.some(f => f.id === targetId);
      if (!exists) return;
      const isDisq = cond.jumpTo === "disqualify";
      const isSub  = cond.jumpTo === "submit";
      const color  = isDisq ? "#f87171" : isSub ? "#4ade80" : "#7D83BD";
      pushEdge({
        id: `cond-${field.id}-${ci}`,
        source: field.id, target: targetId,
        type: "smoothstep", animated: true,
        deletable: true,
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

  nodes.push({ id: "submit",     type: "endNode", data: { type: "submit" },     position: { x: 0, y: fields.length * 160 }, draggable: true });
  if (needsDisq) nodes.push({ id: "disqualify", type: "endNode", data: { type: "disqualify" }, position: { x: NODE_W + 80, y: fields.length * 160 }, draggable: true });

  return { nodes, edges };
}

// ─── Dagre layout ──────────────────────────────────────────────────────────────
async function applyLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const dagre = await import("@dagrejs/dagre");
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 90, nodesep: 80, marginx: 60, marginy: 60 });
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
  const [hover, setHover] = useState<string | null>(null);
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, background: "transparent", border: "none",
    color: "rgba(255,255,255,0.45)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, transition: "color 0.1s, background 0.1s",
  };
  const hoverStyle = { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" };
  return (
    <div style={{
      position: "absolute", left: 16, bottom: 80,
      background: "rgba(10,10,20,0.88)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 4,
      display: "flex", flexDirection: "column", gap: 2,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 5,
    }}>
      {[
        { id: "in",  icon: "+",  action: () => zoomIn(),  title: "Aproximar" },
        { id: "out", icon: "−",  action: () => zoomOut(), title: "Afastar" },
        { id: "fit", icon: "⤢", action: () => fitView({ padding: 0.3 }), title: "Ajustar" },
      ].map(b => (
        <button key={b.id} onClick={b.action} title={b.title}
          onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)}
          style={{ ...btnStyle, ...(hover === b.id ? hoverStyle : {}) }}>
          {b.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Connection Modal ──────────────────────────────────────────────────────────
function ConnectionModal({
  sourceField,
  targetLabel,
  onConfirm,
  onClose,
}: {
  sourceField: FormField;
  targetLabel: string;
  onConfirm: (cond: { operator: FieldCondition["operator"]; value: string }) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [operator, setOperator] = useState<FieldCondition["operator"]>("equals");
  const [value, setValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [yesNoVal, setYesNoVal] = useState<"sim" | "nao">("sim");
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const meta = TYPE_META[sourceField.type] ?? { icon: "?", label: sourceField.type, color: "#94a3b8" };
  const isMC = sourceField.type === "multiple_choice";
  const isYN = sourceField.type === "yes_no";

  const handleConfirm = () => {
    let finalValue = value.trim();
    if (isMC) finalValue = selectedOptions.join(", ");
    if (isYN) finalValue = yesNoVal;
    if (!finalValue) return;
    onConfirm({ operator, value: finalValue });
  };

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.15s ease",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 9999,
        width: 380, maxWidth: "90vw",
        background: "linear-gradient(160deg, #12121f 0%, #0c0c18 100%)",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden", animation: "slideUp 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${meta.color}DD 0%, ${meta.color}44 100%)` }} />
        <div style={{ padding: "20px 22px 22px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 3, letterSpacing: "0.04em" }}>
                NOVA REGRA CONDICIONAL
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
                {sourceField.label.slice(0, 34)}{sourceField.label.length > 34 ? "…" : ""}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                → {targetLabel}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
            }}>✕</button>
          </div>

          {/* MC: option checkboxes */}
          {isMC && sourceField.options && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" }}>
                Quando a resposta for
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sourceField.options.map(opt => {
                  const checked = selectedOptions.includes(opt);
                  return (
                    <label key={opt} onClick={() => toggleOption(opt)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                      background: checked ? "rgba(125,131,189,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${checked ? "rgba(125,131,189,0.3)" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.12s",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                        background: checked ? "#7D83BD" : "transparent",
                        border: `1px solid ${checked ? "#7D83BD" : "rgba(255,255,255,0.2)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {checked && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      <span style={{ fontSize: 12.5, color: checked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* YesNo */}
          {isYN && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" }}>
                Quando a resposta for
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["sim", "nao"] as const).map(v => {
                  const active = yesNoVal === v;
                  return (
                    <button key={v} onClick={() => setYesNoVal(v)} style={{
                      flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                      background: active ? "rgba(125,131,189,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(125,131,189,0.4)" : "rgba(255,255,255,0.07)"}`,
                      color: active ? "#CBCDE5" : "rgba(255,255,255,0.45)",
                      fontSize: 13, fontWeight: 600, transition: "all 0.12s",
                    }}>
                      {v === "sim" ? "Sim" : "Não"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Text/number/generic */}
          {!isMC && !isYN && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {(["equals", "not_equals", "contains"] as const).map(op => {
                  const labels = { equals: "igual a", not_equals: "diferente de", contains: "contém" };
                  const active = operator === op;
                  return (
                    <button key={op} onClick={() => setOperator(op)} style={{
                      flex: 1, padding: "6px 4px", borderRadius: 8, cursor: "pointer", fontSize: 10.5,
                      background: active ? "rgba(125,131,189,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(125,131,189,0.4)" : "rgba(255,255,255,0.07)"}`,
                      color: active ? "#CBCDE5" : "rgba(255,255,255,0.4)",
                      fontWeight: active ? 600 : 400, transition: "all 0.12s",
                    }}>
                      {labels[op]}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Valor da condição…"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.85)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={isMC ? selectedOptions.length === 0 : (!isYN && !value.trim())}
            style={{
              width: "100%", padding: "10px", borderRadius: 10, cursor: "pointer",
              background: "rgba(125,131,189,0.18)", border: "1px solid rgba(125,131,189,0.3)",
              color: "#CBCDE5", fontSize: 13, fontWeight: 600, transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(125,131,189,0.28)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(125,131,189,0.18)")}
          >
            Criar regra →
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

// ─── Field Side Panel ──────────────────────────────────────────────────────────
function FieldModal({
  field, fields, onClose, onUpdate,
}: {
  field: FormField;
  fields: FormField[];
  onClose: () => void;
  onEdit: () => void;         // kept in signature for compat, unused
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const fieldIndex = fields.findIndex(f => f.id === field.id);

  return createPortal(
    <>
      {/* Backdrop — click to close */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.45)",
        animation: "fadeIn 0.15s ease",
      }} />

      {/* Slide-in panel from right */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9999,
        width: 480, maxWidth: "90vw",
        background: "hsl(var(--background))",
        borderLeft: "1px solid hsl(var(--border))",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid hsl(var(--border))",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", opacity: 0.7 }}>
            Editar campo
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>✕</button>
        </div>

        {/* FieldConfig scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <FieldConfig
            field={field}
            index={fieldIndex}
            total={fields.length}
            allFields={fields}
            onChange={onUpdate}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>,
    document.body
  );
}

// ─── Inner Canvas ──────────────────────────────────────────────────────────────
function FlowInner({
  fields,
  selectedId,
  onSelectField,
  onEditField,
  onFieldsChange,
}: {
  fields: FormField[];
  selectedId: string | null;
  onSelectField: (id: string) => void;
  onEditField: (id: string) => void;
  onFieldsChange: (fields: FormField[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [modalField, setModalField] = useState<FormField | null>(null);
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(fields, selectedId);
    applyLayout(n, e).then(layouted => {
      setNodes(layouted);
      setEdges(e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedId]);

  // Node click → open FieldModal
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "fieldNode") {
      const field = fieldsRef.current.find(f => f.id === node.id);
      if (field) setModalField(field);
    }
  }, []);

  // Drop from sidebar → new field
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/donforms-field") as FieldType | "";
    if (!type) return;
    // screenToFlowPosition used only to validate it's on canvas — actual order is append
    screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newField = makeField(type);
    onFieldsChange([...fieldsRef.current, newField]);
    // Open modal for new field (no tab switch)
    setTimeout(() => setModalField(newField), 80);
  }, [screenToFlowPosition, onFieldsChange]);

  // New edge from handle drag
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target) return;
    // Don't connect to itself
    if (source === target) return;
    setPendingConn({ source, target });
  }, []);

  const handleConnectionConfirm = useCallback(({ operator, value }: { operator: FieldCondition["operator"]; value: string }) => {
    if (!pendingConn) return;
    const { source, target } = pendingConn;
    const newFields = fieldsRef.current.map(f => {
      if (f.id !== source) return f;
      const newCond: FieldCondition = {
        fieldId: source,
        operator,
        value,
        jumpTo: target,
      };
      return { ...f, conditions: [...(f.conditions ?? []), newCond] };
    });
    onFieldsChange(newFields);
    setPendingConn(null);
  }, [pendingConn, onFieldsChange]);

  // Delete edges → remove corresponding conditions
  const onEdgesDelete: OnEdgesDelete = useCallback((deletedEdges) => {
    let newFields = [...fieldsRef.current];
    for (const edge of deletedEdges) {
      // Only conditional edges have id format: cond-{fieldId}-{condIndex}
      if (!edge.id.startsWith("cond-")) continue;
      const parts = edge.id.split("-");
      // id: cond-{fieldId}-{condIndex} — fieldId might contain dashes
      const condIndex = parseInt(parts[parts.length - 1], 10);
      const fieldId = parts.slice(1, -1).join("-");
      newFields = newFields.map(f => {
        if (f.id !== fieldId) return f;
        const conds = [...(f.conditions ?? [])];
        conds.splice(condIndex, 1);
        return { ...f, conditions: conds };
      });
    }
    onFieldsChange(newFields);
  }, [onFieldsChange]);

  // Target label for connection modal
  const targetLabel = (() => {
    if (!pendingConn) return "";
    if (pendingConn.target === "submit") return "✓ Enviar formulário";
    if (pendingConn.target === "disqualify") return "✕ Desqualificar lead";
    const f = fields.find(f => f.id === pendingConn.target);
    return f ? f.label.slice(0, 30) : pendingConn.target;
  })();

  const sourceField = pendingConn ? fields.find(f => f.id === pendingConn.source) : null;

  return (
    <div style={{ flex: 1, height: "100%", position: "relative", overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#06060e" }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={["Delete", "Backspace"]}
        connectionLineStyle={{ stroke: "#6C63FF", strokeWidth: 1.5, strokeDasharray: "5,5" }}
        connectionLineType={"smoothstep" as import("@xyflow/react").ConnectionLineType}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(255,255,255,0.045)" />
        <CustomControls />
      </ReactFlow>

      {/* Delete hint */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 5,
        background: "rgba(7,7,15,0.8)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
        padding: "5px 10px", fontSize: 10.5, color: "rgba(255,255,255,0.22)",
        pointerEvents: "none",
      }}>
        Selecione uma seta + Delete para removê-la
      </div>

      {/* Legend */}
      {fields.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 18, alignItems: "center",
          background: "rgba(7,7,15,0.88)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "7px 18px",
          pointerEvents: "none", zIndex: 5, boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
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
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.32)", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>
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
            background: "rgba(125,131,189,0.08)", border: "1px solid rgba(125,131,189,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>◆</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontWeight: 500 }}>
            Arraste um tipo de campo da esquerda para começar
          </p>
        </div>
      )}

      {/* Field detail modal */}
      {modalField && (
        <FieldModal
          field={fields.find(f => f.id === modalField.id) ?? modalField}
          fields={fields}
          onClose={() => setModalField(null)}
          onEdit={() => { onEditField(modalField.id); setModalField(null); }}
          onUpdate={(patch) => {
            const updated = fields.map(f => f.id === modalField.id ? { ...f, ...patch } : f);
            onFieldsChange(updated);
          }}
        />
      )}

      {/* Connection modal */}
      {pendingConn && sourceField && (
        <ConnectionModal
          sourceField={sourceField}
          targetLabel={targetLabel}
          onConfirm={handleConnectionConfirm}
          onClose={() => setPendingConn(null)}
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
  onEditField,
  onFieldsChange,
}: {
  fields: FormField[];
  selectedId: string | null;
  onSelectField: (id: string) => void;
  onEditField: (id: string) => void;
  onFieldsChange: (fields: FormField[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <FlowSidebar />
        <FlowInner
          fields={fields}
          selectedId={selectedId}
          onSelectField={onSelectField}
          onEditField={onEditField}
          onFieldsChange={onFieldsChange}
        />
      </div>
    </ReactFlowProvider>
  );
}
