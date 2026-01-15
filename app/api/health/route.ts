import { NextResponse } from 'next/server';

export async function GET() {
    console.log('[API] /api/health - Health check requested');
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
