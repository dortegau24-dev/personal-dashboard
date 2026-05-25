import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { pin } = await req.json();
  const correctPin = process.env.ACCESS_PIN || '1234';

  if (pin !== correctPin) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  // Return Supabase credentials so the client can sign in
  return NextResponse.json({
    email: process.env.AUTH_EMAIL,
    password: process.env.AUTH_PASSWORD,
  });
}
