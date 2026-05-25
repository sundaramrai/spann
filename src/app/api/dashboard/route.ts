import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/repository";
import { dashboardWindowSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const windowHours = dashboardWindowSchema.parse(new URL(request.url).searchParams.get("windowHours") ?? undefined);
  return NextResponse.json(await getDashboardStats(windowHours));
}
