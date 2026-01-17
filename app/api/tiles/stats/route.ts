import { NextResponse } from 'next/server';
import { TileCache } from '@/app/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stats = await TileCache.getStats();

        return NextResponse.json({
            status: 'ok',
            cache: {
                redis: stats,
                info: 'Check browser console for service worker cache stats',
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[TileStats] Error:', error);
        return NextResponse.json(
            {
                status: 'error',
                error: 'Failed to retrieve cache statistics',
            },
            { status: 500 }
        );
    }
}
