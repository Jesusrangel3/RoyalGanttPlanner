import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // Mismo SameSite=None;Secure que en login para borrar la cookie en iframe cross-origin
  cookies().set('session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 0,
    path: '/'
  });
  return NextResponse.json({ success: true });
}
