import { NextRequest, NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(request: NextRequest) {
  return request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

export function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
