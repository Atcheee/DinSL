import { NextResponse } from "next/server";
import { UpstreamError } from "./slClient";

export const errorResponse = (message: string, code: string, status: number) =>
  NextResponse.json({ error: { message, code } }, { status });

export const handleRouteError = (error: unknown) => {
  if (error instanceof UpstreamError) {
    return errorResponse(error.message, error.code, error.status);
  }

  console.error(error);
  return errorResponse("Internt serverfel", "INTERNAL_ERROR", 500);
};
