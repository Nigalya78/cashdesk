import { NextResponse } from 'next/server';

export function sendSuccess<T>(
  data: T | undefined,
  message: string,
  statusCode = 200
): NextResponse {
  return NextResponse.json({ success: true, message, data }, { status: statusCode });
}

export function sendError(
  message: string,
  statusCode = 400,
  errors?: string[]
): NextResponse {
  return NextResponse.json({ success: false, message, errors }, { status: statusCode });
}
