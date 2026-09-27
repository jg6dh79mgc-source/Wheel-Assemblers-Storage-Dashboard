import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'Wheel-Assemblers-Storage-Dashboard',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
