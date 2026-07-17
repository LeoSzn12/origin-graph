import { NextResponse } from "next/server";
import { db } from "@/db";

const labelTables: Record<string, { table: string; label: string }> = {
  claim: { table: "claims", label: "statement" }, event: { table: "events", label: "title" },
  entity: { table: "entities", label: "preferred_name" }, place: { table: "places", label: "preferred_name" },
  motif: { table: "motifs", label: "label" }, hypothesis: { table: "hypotheses", label: "title" },
  source_edition: { table: "source_editions", label: "title" }, passage: { table: "passages", label: "locator_value" }
};

async function label(type: string, id: string): Promise<string> {
  const config = labelTables[type];
  if (!config) return `${type}:${id.slice(0,8)}`;
  const result = await db().query<{ label: string }>(`SELECT ${config.label} AS label FROM ${config.table} WHERE id=$1`, [id]);
  return result.rows[0]?.label ?? `${type}:${id.slice(0,8)}`;
}

export async function GET(_request: Request, context: { params: Promise<{ objectType: string; objectId: string }> }) {
  const { objectType, objectId } = await context.params;
  const result = await db().query<{
    id: string; from_type: string; from_id: string; to_type: string; to_id: string;
    connection_type: string; explanation: string; confidence: string; review_status: string;
  }>(
    `SELECT * FROM connections WHERE review_status IN ('approved','published')
     AND ((from_type=$1 AND from_id=$2) OR (to_type=$1 AND to_id=$2)) LIMIT 100`, [objectType, objectId]);
  const nodeKeys = new Map<string, { id: string; type: string }>();
  nodeKeys.set(`${objectType}:${objectId}`, { id: objectId, type: objectType });
  for (const edge of result.rows) {
    nodeKeys.set(`${edge.from_type}:${edge.from_id}`, { id: edge.from_id, type: edge.from_type });
    nodeKeys.set(`${edge.to_type}:${edge.to_id}`, { id: edge.to_id, type: edge.to_type });
  }
  const nodes = await Promise.all([...nodeKeys.entries()].map(async ([key, node]) => ({ data: { id: key, object_id: node.id, type: node.type, label: await label(node.type, node.id) } })));
  const edges = result.rows.map((edge) => ({ data: { id: edge.id, source: `${edge.from_type}:${edge.from_id}`, target: `${edge.to_type}:${edge.to_id}`, label: edge.connection_type.replaceAll("_"," "), explanation: edge.explanation, confidence: edge.confidence } }));
  return NextResponse.json({ nodes, edges });
}

