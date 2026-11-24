import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  GitBranch,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import {
  executeWorkflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '../engine/workflowEngine';
import { CALCULATOR_REGISTRY } from '../engine/calculators';
import { DocumentHead } from '../components/seo/DocumentHead';
import {
  CosmicEntrance,
  LiquidGlassReveal,
  MagneticButton,
  WorkflowDataFlow,
} from '../components/motion/MotionLibrary';

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: 'input_loan',
    kind: 'input',
    title: 'Loan Parameters Input',
    x: 24,
    y: 40,
    inputValues: { principal: 2500000, rate: 8.5, years: 20 },
  },
  {
    id: 'calc_emi',
    kind: 'calculator',
    title: 'EMI Calculator',
    x: 310,
    y: 40,
    calculatorId: 'emi',
  },
  {
    id: 'formula_annual',
    kind: 'formula',
    title: 'Annual EMI + 18% Fee',
    x: 595,
    y: 40,
    formulaExpr: 'in1 * 12',
  },
  {
    id: 'out_report',
    kind: 'output',
    title: 'Annual Cash Outflow Report',
    x: 870,
    y: 40,
  },
];

const INITIAL_EDGES: WorkflowEdge[] = [
  { id: 'e1', fromNodeId: 'input_loan', toNodeId: 'calc_emi' },
  { id: 'e2', fromNodeId: 'calc_emi', toNodeId: 'formula_annual' },
  { id: 'e3', fromNodeId: 'formula_annual', toNodeId: 'out_report' },
];

export const WorkflowBuilderPage: React.FC = () => {
  const { savedWorkflows, saveWorkflow, deleteWorkflow, showToast, addReport } = useStudio();
  const [workflowName, setWorkflowName] = useState('Home Loan EMI Pipeline');
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('input_loan');
  const [edgeFrom, setEdgeFrom] = useState<string>('input_loan');
  const [edgeTo, setEdgeTo] = useState<string>('calc_emi');

  const draggingRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const execution = useMemo(() => executeWorkflow(nodes, edges), [nodes, edges]);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const addNode = (kind: WorkflowNode['kind']) => {
    const id = `${kind}_${Date.now().toString(36)}`;
    const base: WorkflowNode = {
      id,
      kind,
      title:
        kind === 'input'
          ? 'Input Data'
          : kind === 'calculator'
          ? 'Percentage Calc'
          : kind === 'formula'
          ? 'Transform Formula'
          : 'Final Output',
      x: 60 + ((nodes.length * 45) % 450),
      y: 190 + ((nodes.length * 30) % 140),
      ...(kind === 'input' ? { inputValues: { x: 18, y: 1000 } } : {}),
      ...(kind === 'calculator' ? { calculatorId: 'percentage' } : {}),
      ...(kind === 'formula' ? { formulaExpr: 'in1 * 1.18' } : {}),
    };
    setNodes((prev) => [...prev, base]);
    setSelectedNodeId(id);
  };

  const addEdge = () => {
    if (edgeFrom === edgeTo) {
      showToast('Cannot connect a node to itself.', 'error');
      return;
    }
    if (edges.some((e) => e.fromNodeId === edgeFrom && e.toNodeId === edgeTo)) {
      showToast('Connection already exists.', 'info');
      return;
    }
    setEdges((prev) => [...prev, { id: `edge-${Date.now()}`, fromNodeId: edgeFrom, toNodeId: edgeTo }]);
  };

  const handleSaveWorkflow = () => {
    saveWorkflow({
      id: `wf-${workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: workflowName,
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExportWorkflow = () => {
    const blob = new Blob([JSON.stringify({ name: workflowName, nodes, edges, execution }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <DocumentHead
        title="Visual Calculation Workflow Builder – BULK CALCULATOR STUDIO"
        description="Chain deterministic calculators into visual node pipelines with cycle detection and live intermediate outputs."
      />

      <CosmicEntrance>
        <LiquidGlassReveal className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <GitBranch className="h-4 w-4 text-cyan-500" />
                <span>DAG Execution Engine · Circular Dependency Protection</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                Visual Calculation Workflow Builder
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                aria-label="Workflow name"
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
              />
              <MagneticButton variant="outline" onClick={handleExportWorkflow}>
                <Download className="h-4 w-4" /> Export
              </MagneticButton>
              <MagneticButton variant="primary" onClick={handleSaveWorkflow}>
                <Save className="h-4 w-4" /> Save Flow
              </MagneticButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <MagneticButton variant="secondary" onClick={() => addNode('input')}>
              <Plus className="h-3.5 w-3.5" /> Input Node
            </MagneticButton>
            <MagneticButton variant="secondary" onClick={() => addNode('calculator')}>
              <Plus className="h-3.5 w-3.5" /> Calculator Node
            </MagneticButton>
            <MagneticButton variant="secondary" onClick={() => addNode('formula')}>
              <Plus className="h-3.5 w-3.5" /> Formula Node
            </MagneticButton>
            <MagneticButton variant="secondary" onClick={() => addNode('output')}>
              <Plus className="h-3.5 w-3.5" /> Output Node
            </MagneticButton>
            <MagneticButton
              variant="outline"
              onClick={() =>
                addReport({
                  title: `Workflow Report: ${workflowName}`,
                  source: 'Visual Workflow Builder',
                  inputs: [{ label: 'Total Nodes', value: String(nodes.length) }],
                  formulas: nodes.filter((n) => n.formulaExpr).map((n) => n.formulaExpr!),
                  assumptions: 'Executed in verified topological DAG order.',
                  results: execution.executionOrder.map((id) => {
                    const n = nodes.find((x) => x.id === id);
                    const r = execution.results[id];
                    return { label: n?.title || id, value: r?.formatted || '—' };
                  }),
                  warnings: execution.errors,
                })
              }
            >
              <Play className="h-3.5 w-3.5" /> Save Execution Report
            </MagneticButton>
          </div>
        </LiquidGlassReveal>
      </CosmicEntrance>

      {execution.hasCycle && (
        <LiquidGlassReveal className="border-rose-500/50 p-4 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Circular Dependency Detected: {execution.cycleNodeIds.join(', ')}</span>
          </div>
        </LiquidGlassReveal>
      )}

      {/* Draggable Node Canvas */}
      <LiquidGlassReveal className="p-4">
        <div
          className="relative h-[420px] w-full overflow-auto rounded-xl border border-slate-200/70 bg-slate-950/5 dark:border-slate-800 dark:bg-slate-950/50"
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const d = draggingRef.current;
            const dx = e.clientX - d.startX;
            const dy = e.clientY - d.startY;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === d.id
                  ? { ...n, x: Math.max(8, d.origX + dx), y: Math.max(8, d.origY + dy) }
                  : n
              )
            );
          }}
          onPointerUp={() => {
            draggingRef.current = null;
          }}
        >
          {/* SVG Connection Lines */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full min-w-[1120px]">
            {edges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.fromNodeId);
              const to = nodes.find((n) => n.id === edge.toNodeId);
              if (!from || !to) return null;
              const x1 = from.x + 230;
              const y1 = from.y + 54;
              const x2 = to.x;
              const y2 = to.y + 54;
              const cx = (x1 + x2) / 2;
              return (
                <path
                  key={edge.id}
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--page-accent)"
                  strokeWidth={2.5}
                  strokeOpacity={0.75}
                />
              );
            })}
          </svg>

          {/* Draggable Nodes */}
          {nodes.map((node) => {
            const res = execution.results[node.id];
            const isCycle = execution.cycleNodeIds.includes(node.id);
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onPointerDown={(e) => {
                  setSelectedNodeId(node.id);
                  draggingRef.current = {
                    id: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: node.x,
                    origY: node.y,
                  };
                }}
                style={{ left: node.x, top: node.y, width: 230 }}
                className={`liquid-glass absolute cursor-grab rounded-xl p-3 select-none active:cursor-grabbing ${
                  isCycle
                    ? 'border-rose-500 ring-2 ring-rose-500/40'
                    : isSelected
                    ? 'ring-2 ring-cyan-500/60'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <span>{node.kind}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNodes((prev) => prev.filter((n) => n.id !== node.id));
                      setEdges((prev) =>
                        prev.filter((ed) => ed.fromNodeId !== node.id && ed.toNodeId !== node.id)
                      );
                    }}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label={`Remove ${node.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-0.5 truncate font-display text-xs font-semibold">{node.title}</div>
                <WorkflowDataFlow active={res?.status === 'success'} className="my-2" />
                <div className="truncate font-mono text-xs font-bold tabular-nums">
                  {res?.status === 'error' ? (
                    <span className="text-rose-500">{res.error}</span>
                  ) : (
                    <span className="text-cyan-600 dark:text-cyan-300">{res?.formatted || 'Pending'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </LiquidGlassReveal>

      {/* Node Inspector & Edge Wiring */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LiquidGlassReveal className="p-5 space-y-4">
          <h2 className="font-display text-base font-semibold">
            Node Inspector {selectedNode ? `· ${selectedNode.title}` : ''}
          </h2>
          {selectedNode ? (
            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium">Node Title</span>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, title: e.target.value } : n))
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              {selectedNode.kind === 'calculator' && (
                <label className="block space-y-1">
                  <span className="font-medium">Bound Deterministic Calculator</span>
                  <select
                    value={selectedNode.calculatorId || 'emi'}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, calculatorId: e.target.value } : n
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    {CALCULATOR_REGISTRY.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedNode.kind === 'formula' && (
                <label className="block space-y-1">
                  <span className="font-medium">Safe Formula (use in1, in2...)</span>
                  <input
                    type="text"
                    value={selectedNode.formulaExpr || 'in1'}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, formulaExpr: e.target.value } : n
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              )}

              {selectedNode.kind === 'input' && (
                <div className="space-y-2">
                  <span className="font-medium block">Input Key/Values</span>
                  {Object.entries(selectedNode.inputValues || {}).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 gap-2">
                      <span className="rounded-lg border border-slate-200 px-2.5 py-2 font-mono dark:border-slate-800">
                        {k}
                      </span>
                      <input
                        type="text"
                        value={String(v)}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    inputValues: {
                                      ...(n.inputValues || {}),
                                      [k]: Number.isNaN(Number(e.target.value))
                                        ? e.target.value
                                        : Number(e.target.value),
                                    },
                                  }
                                : n
                            )
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Click any node on the canvas to configure it.</p>
          )}
        </LiquidGlassReveal>

        <LiquidGlassReveal className="p-5 space-y-4">
          <h2 className="font-display text-base font-semibold">Node Connections &amp; Saved Flows</h2>
          <div className="grid grid-cols-5 gap-2 items-center text-xs">
            <select
              value={edgeFrom}
              onChange={(e) => setEdgeFrom(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            <select
              value={edgeTo}
              onChange={(e) => setEdgeTo(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            <MagneticButton variant="primary" onClick={addEdge} className="col-span-1 px-2">
              Link
            </MagneticButton>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
            {edges.map((ed) => {
              const f = nodes.find((n) => n.id === ed.fromNodeId)?.title || ed.fromNodeId;
              const t = nodes.find((n) => n.id === ed.toNodeId)?.title || ed.toNodeId;
              return (
                <div key={ed.id} className="flex items-center justify-between rounded-lg border border-slate-200/70 px-3 py-1.5 dark:border-slate-800">
                  <span>{f} → {t}</span>
                  <button
                    type="button"
                    onClick={() => setEdges((prev) => prev.filter((x) => x.id !== ed.id))}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {savedWorkflows.length > 0 && (
            <div className="border-t border-slate-200/70 pt-3 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold text-slate-500">Saved Workflows</div>
              <div className="space-y-1.5">
                {savedWorkflows.map((wf) => (
                  <div key={wf.id} className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkflowName(wf.name);
                        setNodes(wf.nodes);
                        setEdges(wf.edges);
                      }}
                      className="font-medium text-cyan-500 hover:underline"
                    >
                      {wf.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWorkflow(wf.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </LiquidGlassReveal>
      </div>
    </div>
  );
};
