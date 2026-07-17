import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ bands: [
    { key: "human-origins", label: "Human Origins", from: -7000000, to: -50000 },
    { key: "late-pleistocene", label: "Late Pleistocene", from: -50000, to: -10000 },
    { key: "early-holocene", label: "Early Holocene", from: -10000, to: -4000 },
    { key: "ancient", label: "Ancient Civilizations", from: -4000, to: 500 },
    { key: "medieval", label: "Medieval to Early Modern", from: 500, to: 1800 },
    { key: "modern", label: "Modern", from: 1800, to: new Date().getUTCFullYear() }
  ] });
}

