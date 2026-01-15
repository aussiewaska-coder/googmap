import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
