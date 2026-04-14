/**
 * BPMN 2.0 XML export utility for Ledgerium AI process maps.
 *
 * Converts a ProcessMap (from @ledgerium/process-engine) into a valid
 * BPMN 2.0 definitions document.
 *
 * Mapping:
 * - ProcessMap phases     → Lanes in a LaneSet
 * - ProcessMapNodes       → BPMN FlowNodes (startEvent, endEvent, task, exclusiveGateway)
 * - ProcessMapEdges       → BPMN SequenceFlows
 *
 * The output is spec-compliant BPMN 2.0 XML with correct namespace declarations
 * and structural ordering (Process before BPMNDiagram section).
 */

import type { ProcessMap, ProcessMapNode, ProcessMapEdge, ProcessMapPhase } from '@ledgerium/process-engine';

// ─── Constants ────────────────────────────────────────────────────────────────

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';

/** Default node dimensions for the BPMNDI section. */
const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;
const EVENT_SIZE = 36;
const GATEWAY_SIZE = 50;
const LANE_WIDTH = 900;
const LANE_HEIGHT = 150;
const LANE_HEADER_WIDTH = 30;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Escape a string for safe XML attribute embedding. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Map a ProcessMapNodeType to the appropriate BPMN element tag. */
function nodeToBpmnTag(node: ProcessMapNode): string {
  switch (node.nodeType) {
    case 'start':
      return 'startEvent';
    case 'end':
      return 'endEvent';
    case 'decision':
      return 'exclusiveGateway';
    case 'exception':
    case 'task':
    default:
      return 'task';
  }
}

/** Return x/y dimensions for a node type used in BPMNDI. */
function nodeDimensions(node: ProcessMapNode): { width: number; height: number } {
  switch (node.nodeType) {
    case 'start':
    case 'end':
      return { width: EVENT_SIZE, height: EVENT_SIZE };
    case 'decision':
      return { width: GATEWAY_SIZE, height: GATEWAY_SIZE };
    default:
      return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
}

// ─── BPMN Process elements ────────────────────────────────────────────────────

function buildLaneSet(phases: ProcessMapPhase[]): string {
  if (phases.length === 0) return '';

  const lanes = phases
    .map(
      (phase) => `
    <lane id="Lane_${phase.id}" name="${escapeXml(phase.name)}">
      ${phase.stepNodeIds.map((nodeId) => `<flowNodeRef>${nodeId}</flowNodeRef>`).join('\n      ')}
    </lane>`,
    )
    .join('');

  return `
  <laneSet id="LaneSet_1">
    ${lanes}
  </laneSet>`;
}

function buildFlowNodes(nodes: ProcessMapNode[]): string {
  return nodes
    .map((node) => {
      const tag = nodeToBpmnTag(node);
      const name = escapeXml(node.title);
      return `  <${tag} id="${node.id}" name="${name}" />`;
    })
    .join('\n');
}

function buildSequenceFlows(edges: ProcessMapEdge[]): string {
  return edges
    .map((edge) => {
      const name = edge.boundaryLabel ? ` name="${escapeXml(edge.boundaryLabel)}"` : '';
      return `  <sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}"${name} />`;
    })
    .join('\n');
}

// ─── BPMNDI diagram elements ──────────────────────────────────────────────────

function buildDiagramShapes(nodes: ProcessMapNode[]): string {
  return nodes
    .map((node) => {
      // Use stored position from the process engine, or fall back to ordinal-based layout
      const x = node.position.x > 0 ? node.position.x : 60 + node.ordinal * 180;
      const y = node.position.y > 0 ? node.position.y : 80;
      const { width, height } = nodeDimensions(node);

      return `
    <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">
      <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
    </bpmndi:BPMNShape>`;
    })
    .join('');
}

function buildDiagramEdges(edges: ProcessMapEdge[]): string {
  return edges
    .map(
      (edge) => `
    <bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">
      <di:waypoint x="0" y="0" />
      <di:waypoint x="100" y="0" />
    </bpmndi:BPMNEdge>`,
    )
    .join('');
}

function buildLaneShapes(phases: ProcessMapPhase[]): string {
  if (phases.length === 0) return '';

  return phases
    .map(
      (phase, index) => `
    <bpmndi:BPMNShape id="Lane_${phase.id}_di" bpmnElement="Lane_${phase.id}" isHorizontal="true">
      <dc:Bounds x="${LANE_HEADER_WIDTH}" y="${index * LANE_HEIGHT}" width="${LANE_WIDTH}" height="${LANE_HEIGHT}" />
    </bpmndi:BPMNShape>`,
    )
    .join('');
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Generate a BPMN 2.0 XML document from a ProcessMap.
 *
 * The output is a well-formed XML document with BPMN 2.0 namespace declarations.
 * Nodes are mapped to appropriate BPMN element types based on their nodeType.
 * Edges become SequenceFlows.
 * Phases become Lanes in a LaneSet (when present).
 */
export function generateBpmnXml(processMap: ProcessMap): string {
  const processId = `Process_${processMap.sessionId}`;
  const diagramId = `BPMNDiagram_${processMap.sessionId}`;
  const planeId = `BPMNPlane_${processMap.sessionId}`;
  const hasPhaseLanes = processMap.phases.length > 0;

  const laneSet = buildLaneSet(processMap.phases);
  const flowNodes = buildFlowNodes(processMap.nodes);
  const sequenceFlows = buildSequenceFlows(processMap.edges);
  const diagramShapes = buildDiagramShapes(processMap.nodes);
  const diagramEdges = buildDiagramEdges(processMap.edges);
  const laneShapes = buildLaneShapes(processMap.phases);

  const processName = escapeXml(processMap.name);
  const targetNamespace = `https://ledgerium.ai/bpmn/${processMap.sessionId}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="${BPMN_NS}"
  xmlns:bpmndi="${BPMNDI_NS}"
  xmlns:dc="${DC_NS}"
  xmlns:di="${DI_NS}"
  id="Definitions_${processMap.sessionId}"
  targetNamespace="${targetNamespace}"
  name="${processName}">

  <process id="${processId}" name="${processName}" isExecutable="false">
    ${laneSet}
    ${flowNodes}
    ${sequenceFlows}
  </process>

  <bpmndi:BPMNDiagram id="${diagramId}">
    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${processId}">
      ${laneShapes}
      ${diagramShapes}
      ${diagramEdges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>

</definitions>`;
}
