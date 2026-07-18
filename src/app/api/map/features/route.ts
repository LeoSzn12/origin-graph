import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { apiError } from "@/http";

export async function GET(request: NextRequest) {
  try {
    const reviewed = request.nextUrl.searchParams.get("reviewed") !== "false";
    const result = await db().query<{
      id: string; preferred_name: string; place_kind: string; uncertainty_type: string;
      uncertainty_note: string | null; sensitive: boolean; external_ids: Record<string, unknown>;
      geojson: string | null;
    }>(
      `SELECT id,preferred_name,place_kind,uncertainty_type,uncertainty_note,sensitive,external_ids,
        CASE WHEN place_kind IN ('literary','mythical') THEN NULL
          ELSE ST_AsGeoJSON(CASE WHEN sensitive THEN public_geometry ELSE geometry END) END AS geojson
       FROM places WHERE (NOT $1 OR review_status IN ('approved','published')) AND preferred_name NOT LIKE 'SYNTHETIC%' ORDER BY preferred_name`, [reviewed]);
    return NextResponse.json({ type: "FeatureCollection", features: result.rows.map((place) => ({
      type: "Feature", id: place.id, geometry: place.geojson ? JSON.parse(place.geojson) : null,
      properties: { name: place.preferred_name, kind: place.place_kind, uncertainty: place.uncertainty_type,
        uncertainty_note: place.uncertainty_note, sensitive: place.sensitive, external_ids: place.external_ids }
    })), attribution: ["Pleiades data, where present, requires attribution under CC BY 3.0."] });
  } catch (error) { return apiError(error); }
}
