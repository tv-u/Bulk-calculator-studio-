import { getCalculatorById } from './calculators';
import { evaluateSafeFormula } from './safeMath';

export type WorkflowNodeKind = 'input' | 'calculator' | 'formula' | 'output';

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  title: string;
  x: number;
  y: number;
  // For 'input': key/value map
  inputValues?: Record<string, number | string>;
  // For 'calculator': calculatorId + static defaults/overrides + bindings from upstream node ids
  calculatorId?: string;
  bindings?: Record<string, string>; // inputKey -> upstreamNodeId
  // For 'formula': expression referencing upstream values or variable aliases (e.g. "in1 * 1.18")
  formulaExpr?: string;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  targetInputKey?: string;
}

export interface WorkflowNodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error';
  primaryValue: number | string;
  formatted: string;
  details: Array<{ label: string; value: string }>;
  error?: string;
}

export interface WorkflowExecutionReport {
  valid: boolean;
  hasCycle: boolean;
  cycleNodeIds: string[];
  executionOrder: string[];
  results: Record<string, WorkflowNodeExecutionResult>;
  errors: string[];
}

export function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowExecutionReport {
  const nodeMap = new Map<string, WorkflowNode>(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (!nodeMap.has(e.fromNodeId) || !nodeMap.has(e.toNodeId)) continue;
    adj.get(e.fromNodeId)!.push(e.toNodeId);
    inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) ?? 0) + 1);
  }

  // Kahn's topological sort for DAG validation + cycle detection
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const executionOrder: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    executionOrder.push(cur);
    for (const nxt of adj.get(cur) || []) {
      const nextDeg = (inDegree.get(nxt) ?? 0) - 1;
      inDegree.set(nxt, nextDeg);
      if (nextDeg === 0) queue.push(nxt);
    }
  }

  if (executionOrder.length < nodes.length) {
    const cycleNodeIds = nodes
      .filter((n) => !executionOrder.includes(n.id))
      .map((n) => n.id);
    return {
      valid: false,
      hasCycle: true,
      cycleNodeIds,
      executionOrder,
      results: {},
      errors: [`Circular dependency detected involving nodes: ${cycleNodeIds.join(', ')}`],
    };
  }

  const results: Record<string, WorkflowNodeExecutionResult> = {};
  const errors: string[] = [];

  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId)!;
    const incomingEdges = edges.filter((e) => e.toNodeId === nodeId);

    try {
      if (node.kind === 'input') {
        const entries = Object.entries(node.inputValues || {});
        const firstVal = entries[0]?.[1] ?? 0;
        results[nodeId] = {
          nodeId,
          status: 'success',
          primaryValue: firstVal,
          formatted: entries.map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Empty input',
          details: entries.map(([k, v]) => ({ label: k, value: String(v) })),
        };
      } else if (node.kind === 'calculator') {
        const calc = node.calculatorId ? getCalculatorById(node.calculatorId) : undefined;
        if (!calc) throw new Error(`Calculator "${node.calculatorId}" not found.`);

        const mergedInputs: Record<string, number | string> = {};
        for (const field of calc.inputs) {
          mergedInputs[field.key] = node.inputValues?.[field.key] ?? field.defaultValue;
        }

        // Apply incoming edges and explicit bindings
        for (const edge of incomingEdges) {
          const upstream = results[edge.fromNodeId];
          if (upstream?.status === 'error') {
            throw new Error(`Upstream node "${edge.fromNodeId}" failed.`);
          }
          if (edge.targetInputKey && upstream) {
            mergedInputs[edge.targetInputKey] = upstream.primaryValue;
          } else {
            const upNode = nodeMap.get(edge.fromNodeId);
            if (upNode?.kind === 'input' && upNode.inputValues) {
              for (const [k, v] of Object.entries(upNode.inputValues)) {
                if (calc.inputs.some((f) => f.key === k)) {
                  mergedInputs[k] = v;
                }
              }
            }
          }
        }

        if (node.bindings) {
          for (const [inputKey, upId] of Object.entries(node.bindings)) {
            if (results[upId]?.status === 'success') {
              mergedInputs[inputKey] = results[upId].primaryValue;
            }
          }
        }

        const calcRes = calc.compute(mergedInputs, { locale: 'en-IN', currency: 'INR' });
        results[nodeId] = {
          nodeId,
          status: 'success',
          primaryValue: calcRes.primary.value,
          formatted: calcRes.primary.formatted,
          details: calcRes.breakdown.slice(0, 4).map((b) => ({ label: b.label, value: b.formatted || String(b.value) })),
        };
      } else if (node.kind === 'formula') {
        const scope: Record<string, number> = {};
        incomingEdges.forEach((edge, idx) => {
          const up = results[edge.fromNodeId];
          if (up?.status === 'error') throw new Error(`Upstream node "${edge.fromNodeId}" failed.`);
          const numVal = typeof up?.primaryValue === 'number' ? up.primaryValue : Number(up?.primaryValue);
          if (Number.isFinite(numVal)) {
            scope[`in${idx + 1}`] = numVal;
            scope[edge.fromNodeId.replace(/[^a-zA-Z0-9_]/g, '_')] = numVal;
            if (edge.targetInputKey) scope[edge.targetInputKey] = numVal;
          }
        });
        if (node.inputValues) {
          for (const [k, v] of Object.entries(node.inputValues)) {
            const n = Number(v);
            if (Number.isFinite(n)) scope[k] = n;
          }
        }
        const expr = node.formulaExpr || 'in1';
        const val = evaluateSafeFormula(expr, scope);
        results[nodeId] = {
          nodeId,
          status: 'success',
          primaryValue: val,
          formatted: val.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          details: [{ label: 'Expression', value: expr }],
        };
      } else {
        // Output / Report Node
        const upstreamSummaries = incomingEdges.map((edge) => {
          const upNode = nodeMap.get(edge.fromNodeId);
          const upRes = results[edge.fromNodeId];
          if (!upRes || upRes.status === 'error') {
            throw new Error(`Upstream node "${upNode?.title || edge.fromNodeId}" failed.`);
          }
          return {
            label: upNode?.title || edge.fromNodeId,
            value: upRes.formatted,
            raw: upRes.primaryValue,
          };
        });
        const primary = upstreamSummaries[upstreamSummaries.length - 1];
        results[nodeId] = {
          nodeId,
          status: 'success',
          primaryValue: primary?.raw ?? 0,
          formatted: primary?.value ?? 'No connected input',
          details: upstreamSummaries.map((u) => ({ label: u.label, value: u.value })),
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Node execution error';
      errors.push(`${node.title}: ${msg}`);
      results[nodeId] = {
        nodeId,
        status: 'error',
        primaryValue: 0,
        formatted: 'Error',
        details: [],
        error: msg,
      };
    }
  }

  return {
    valid: errors.length === 0,
    hasCycle: false,
    cycleNodeIds: [],
    executionOrder,
    results,
    errors,
  };
}
