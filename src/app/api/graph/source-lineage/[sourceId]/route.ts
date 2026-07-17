import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(_request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await context.params;
  const result = await db().query(
    `WITH RECURSIVE lineage AS (
      SELECT sr.*,1 AS depth FROM source_relationships sr WHERE sr.from_source_id=$1 OR sr.to_source_id=$1
      UNION
      SELECT sr.*,l.depth+1 FROM source_relationships sr JOIN lineage l
        ON sr.from_source_id IN (l.from_source_id,l.to_source_id) OR sr.to_source_id IN (l.from_source_id,l.to_source_id)
      WHERE l.depth<3
    ) SELECT DISTINCT l.*,f.title AS from_title,t.title AS to_title,
      f.independence_cluster_key AS from_cluster,t.independence_cluster_key AS to_cluster
      FROM lineage l JOIN source_editions f ON f.id=l.from_source_id JOIN source_editions t ON t.id=l.to_source_id`, [sourceId]);
  return NextResponse.json({ source_id: sourceId, relationships: result.rows });
}
