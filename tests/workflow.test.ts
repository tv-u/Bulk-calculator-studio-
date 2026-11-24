import { describe, expect, it } from 'vitest';
import { executeWorkflow, type WorkflowEdge, type WorkflowNode } from '../src/engine/workflowEngine';

describe('Visual Workflow DAG Execution Engine', () => {
  it('executes Input -> Calculator -> Formula -> Output cleanly in topological order', () => {
    const nodes: WorkflowNode[] = [
      {
        id: 'n1',
        kind: 'input',
        title: 'Loan Terms',
        x: 0,
        y: 0,
        inputValues: { principal: 1000000, rate: 9, years: 10 },
      },
      {
        id: 'n2',
        kind: 'calculator',
        title: 'EMI Calc',
        x: 200,
        y: 0,
        calculatorId: 'emi',
      },
      {
        id: 'n3',
        kind: 'formula',
        title: 'Annual Outflow',
        x: 400,
        y: 0,
        formulaExpr: 'in1 * 12',
      },
      {
        id: 'n4',
        kind: 'output',
        title: 'Final Report',
        x: 600,
        y: 0,
      },
    ];

    const edges: WorkflowEdge[] = [
      { id: 'e1', fromNodeId: 'n1', toNodeId: 'n2' },
      { id: 'e2', fromNodeId: 'n2', toNodeId: 'n3' },
      { id: 'e3', fromNodeId: 'n3', toNodeId: 'n4' },
    ];

    const report = executeWorkflow(nodes, edges);
    expect(report.valid).toBe(true);
    expect(report.hasCycle).toBe(false);
    expect(report.executionOrder).toEqual(['n1', 'n2', 'n3', 'n4']);
    expect(Number(report.results['n2'].primaryValue)).toBeCloseTo(12667.58, 1);
    expect(Number(report.results['n3'].primaryValue)).toBeCloseTo(12667.58 * 12, 0);
    expect(Number(report.results['n4'].primaryValue)).toBeCloseTo(12667.58 * 12, 0);
  });

  it('detects circular dependencies and blocks execution cleanly', () => {
    const nodes: WorkflowNode[] = [
      { id: 'a', kind: 'formula', title: 'Node A', x: 0, y: 0, formulaExpr: 'in1 + 1' },
      { id: 'b', kind: 'formula', title: 'Node B', x: 100, y: 0, formulaExpr: 'in1 * 2' },
    ];
    const edges: WorkflowEdge[] = [
      { id: 'e1', fromNodeId: 'a', toNodeId: 'b' },
      { id: 'e2', fromNodeId: 'b', toNodeId: 'a' },
    ];

    const report = executeWorkflow(nodes, edges);
    expect(report.valid).toBe(false);
    expect(report.hasCycle).toBe(true);
    expect(report.cycleNodeIds).toEqual(expect.arrayContaining(['a', 'b']));
    expect(report.errors[0]).toMatch(/circular/i);
  });
});
