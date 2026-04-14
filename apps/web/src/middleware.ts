import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/entries'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('luminalm_token')?.value;

  if (!token) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
    return NextResponse.redirect(`${apiUrl}/auth/google`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/entries/:path*'],
};
