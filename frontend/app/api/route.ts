import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Chess-O-Clock API",
    version: "1.0.0",
  });
}
