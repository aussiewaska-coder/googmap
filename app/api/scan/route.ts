import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/lib/db';
import { policeReports, trafficAlerts } from '@/app/lib/schema';

const EnvSchema = z.object({
    OPENWEBNINJA_API_KEY: z.string().min(10).optional(),
});

// Use process.env directly if you want, but this helps catch missing keys
const env = EnvSchema.parse(process.env);
// FALLBACK: In case the user hasn't set it yet, we can use a placeholder or handle it gracefully
const API_KEY = process.env.OPENWEBNINJA_API_KEY || 'ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const BodySchema = z.object({
    bbox: z.object({
        w: z.number(),
        s: z.number(),
        e: z.number(),
        n: z.number(),
    }),
});

function cleanText(input: unknown): string {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsedBody = BodySchema.parse(body);
        const { bbox } = parsedBody;

        const bottomLeft = `${bbox.s},${bbox.w}`;
        const topRight = `${bbox.n},${bbox.e}`;

        const alertTypes = [
            'ACCIDENT',
            'HAZARD',
            'POLICE',
            'CAMERA',
            'JAM',
            'ROAD_CLOSED_LANE',
            'FREEWAY_CLOSED',
            'MODERATE_TRAFFIC',
            'HEAVY_TRAFFIC',
            'LIGHT_TRAFFIC'
        ].join(',');

        const targetUrl = `https://api.openwebninja.com/waze/alerts-and-jams?bottom_left=${bottomLeft}&top_right=${topRight}&alert_types=${alertTypes}&max_alerts=500&max_jams=500`;

        console.log(`[Waze API] Fetching from: ${targetUrl}`);

        const owResp = await fetch(targetUrl, {
            headers: { 'x-api-key': API_KEY },
        });

        if (!owResp.ok) {
            console.error(`[Waze API] Upstream error: ${owResp.status}`);
            return NextResponse.json({ error: 'Upstream error', status: owResp.status }, { status: 502 });
        }

        const raw = await owResp.json();
        const alerts = Array.isArray(raw.data?.alerts) ? raw.data.alerts : [];
        const jams = Array.isArray(raw.data?.jams) ? raw.data.jams : [];

        // Filter for police-related alerts
        const policeAlerts = alerts.filter((a: any) => {
            const type = String(a.type ?? '').toUpperCase();
            return type === 'POLICE' || type.includes('POLICE');
        });

        // Upsert police reports to database
        if (policeAlerts.length > 0) {
            try {
                const reportsToInsert = policeAlerts.map((a: any) => ({
                    alertId: String(a.alert_id ?? a.id),
                    type: String(a.type ?? 'POLICE').toUpperCase(),
                    subtype: a.subtype ?? null,
                    latitude: Number(a.latitude ?? a.lat) || null,
                    longitude: Number(a.longitude ?? a.lon) || null,
                    street: a.street ?? null,
                    city: a.city ?? null,
                    alertReliability: a.alert_reliability ?? a.reliability ?? null,
                    publishDatetimeUtc: a.publish_datetime_utc ? new Date(a.publish_datetime_utc) : null,
                }));

                await db.insert(policeReports)
                    .values(reportsToInsert)
                    .onConflictDoUpdate({
                        target: policeReports.alertId,
                        set: {
                            type: policeReports.type,
                            subtype: policeReports.subtype,
                            latitude: policeReports.latitude,
                            longitude: policeReports.longitude,
                            street: policeReports.street,
                            city: policeReports.city,
                            alertReliability: policeReports.alertReliability,
                            publishDatetimeUtc: policeReports.publishDatetimeUtc,
                        },
                    });

                console.log(`[Waze DB] Upserted ${policeAlerts.length} police reports to database`);
            } catch (dbError) {
                console.error('[Waze DB] Error saving police reports:', dbError);
                // Don't fail the request if DB write fails
            }
        }

        // Upsert ALL alerts to traffic_alerts table
        if (alerts.length > 0) {
            try {
                const alertsToInsert = alerts.map((a: any) => ({
                    alertId: String(a.alert_id ?? a.id),
                    type: String(a.type ?? 'ALERT').toUpperCase(),
                    subtype: a.subtype ?? null,
                    latitude: Number(a.latitude ?? a.lat) || null,
                    longitude: Number(a.longitude ?? a.lon) || null,
                    street: a.street ?? null,
                    city: a.city ?? null,
                    alertReliability: a.alert_reliability ?? a.reliability ?? null,
                    alertConfidence: a.alert_confidence ?? a.confidence ?? null,
                    description: cleanText(a.description ?? ''),
                    publishDatetimeUtc: a.publish_datetime_utc ? new Date(a.publish_datetime_utc) : null,
                }));

                await db.insert(trafficAlerts)
                    .values(alertsToInsert)
                    .onConflictDoUpdate({
                        target: trafficAlerts.alertId,
                        set: {
                            type: trafficAlerts.type,
                            subtype: trafficAlerts.subtype,
                            latitude: trafficAlerts.latitude,
                            longitude: trafficAlerts.longitude,
                            street: trafficAlerts.street,
                            city: trafficAlerts.city,
                            alertReliability: trafficAlerts.alertReliability,
                            alertConfidence: trafficAlerts.alertConfidence,
                            description: trafficAlerts.description,
                            publishDatetimeUtc: trafficAlerts.publishDatetimeUtc,
                        },
                    });

                console.log(`[Waze DB] Upserted ${alerts.length} traffic alerts to database`);
            } catch (dbError) {
                console.error('[Waze DB] Error saving traffic alerts:', dbError);
                // Don't fail the request if DB write fails
            }
        }

        const geojson = {
            type: 'FeatureCollection',
            features: [
                ...alerts.map((a: any) => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [Number(a.longitude ?? a.lon), Number(a.latitude ?? a.lat)],
                    },
                    properties: {
                        id: a.alert_id ?? a.id,
                        type: String(a.type ?? 'ALERT').toUpperCase(),
                        subtype: a.subtype ?? '',
                        confidence: a.alert_confidence ?? a.confidence ?? 0,
                        reliability: a.alert_reliability ?? a.reliability ?? 0,
                        street: a.street ?? '',
                        city: a.city ?? '',
                        publishedAt: a.publish_datetime_utc ?? a.published_at,
                        description: cleanText(a.description ?? ''),
                        kind: 'alert',
                    },
                })),
                ...jams.map((j: any) => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [Number(j.longitude ?? j.lon), Number(j.latitude ?? j.lat)],
                    },
                    properties: {
                        id: j.jam_id ?? j.id,
                        type: 'JAM',
                        confidence: j.confidence ?? 0,
                        street: j.street ?? '',
                        city: j.city ?? '',
                        publishedAt: j.publish_datetime_utc,
                        kind: 'jam',
                        delay: j.delay ?? 0,
                    },
                })),
            ],
        };

        return NextResponse.json({
            status: 'ok',
            geojson,
            counts: { alerts: alerts.length, jams: jams.length },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
        }
        console.error('[Waze API] Internal error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
