import { NextRequest, NextResponse } from "next/server";

export function withWorkflow(handler: any) {
  return async (req: NextRequest, ...args: any[]) => {
    console.log(`[WORKFLOW SIMULATOR] 🔗 Wrapper withWorkflow invocado para Next.js Route Handler`);
    return NextResponse.json({ success: true, message: "Workflow simulated endpoint" });
  };
}
