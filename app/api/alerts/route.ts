import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { trafficAlerts } from '@/app/lib/schema';
import { sql, gte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const hoursParam = searchParams.get('hours');
        const hours = hoursParam ? parseFloat(hoursParam) : 1;

        // Calculate the time threshold
        const timeThreshold = new Date();
        timeThreshold.setHours(timeThreshold.getHours() - hours);

        // Query alerts within the time horizon
        const alerts = await db
            .select()
            .from(trafficAlerts)
            .where(gte(trafficAlerts.publishDatetimeUtc, timeThreshold));

        // Convert to GeoJSON
        const geojson = {
            type: 'FeatureCollection',
            features: alerts
                .filter(a => a.latitude !== null && a.longitude !== null)
                .map(a => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [a.longitude!, a.latitude!],
                    },
                    properties: {
                        id: a.alertId,
                        type: a.type,
                        subtype: a.subtype,
                        confidence: a.alertConfidence ?? 0,
                        reliability: a.alertReliability ?? 0,
                        street: a.street ?? '',
                        city: a.city ?? '',
                        publishedAt: a.publishDatetimeUtc?.toISOString(),
                        description: a.description ?? '',
                        kind: 'alert',
                    },
                })),
        };

        return NextResponse.json({
            status: 'ok',
            geojson,
            count: alerts.length,
            timeHorizon: hours,
        });
    } catch (error) {
        console.error('[Alerts API] Error fetching alerts:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
