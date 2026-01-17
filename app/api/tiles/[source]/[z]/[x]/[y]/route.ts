import { NextRequest, NextResponse } from 'next/server';
import { TileCache } from '@/app/lib/redis';

// Tile source upstream configurations
const TILE_SOURCES = {
    satellite: {
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        contentType: 'image/jpeg',
        timeout: 15000,
    },
    terrain: {
        url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    streets: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    topo: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        contentType: 'image/jpeg',
        timeout: 15000,
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    voyager: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    labels: {
        // Labels overlay for any base map
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        contentType: 'image/png',
        timeout: 15000,
    },
    // Tactical/Specialized Maps
    opentopo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    cyclosm: {
        url: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    usgs_imagery: {
        url: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        contentType: 'image/jpeg',
        timeout: 15000,
    },
    usgs_topo: {
        url: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
        contentType: 'image/jpeg',
        timeout: 15000,
    },
    openseamap: {
        url: 'https://t1.openseamap.org/tiles/base/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
    mtbmap: {
        url: 'http://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png',
        contentType: 'image/png',
        timeout: 10000,
    },
} as const;

type TileSource = keyof typeof TILE_SOURCES;

// Enable edge runtime for global distribution and faster cold starts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ source: string; z: string; x: string; y: string }> }
) {
    const startTime = Date.now();

    try {
        const { source, z, x, y } = await params;

        // Validate source
        if (!(source in TILE_SOURCES)) {
            return new NextResponse('Invalid tile source', { status: 400 });
        }

        const tileSource = source as TileSource;
        const zoom = parseInt(z, 10);
        const tileX = parseInt(x, 10);
        const tileY = parseInt(y, 10);

        // Validate tile coordinates
        if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
            return new NextResponse('Invalid tile coordinates', { status: 400 });
        }

        // Validate zoom level (0-22 is standard for web mercator)
        if (zoom < 0 || zoom > 22) {
            return new NextResponse('Invalid zoom level', { status: 400 });
        }

        // Validate tile bounds for zoom level (2^zoom tiles per axis)
        const maxTile = Math.pow(2, zoom);
        if (tileX < 0 || tileX >= maxTile || tileY < 0 || tileY >= maxTile) {
            return new NextResponse('Tile coordinates out of bounds', { status: 400 });
        }

        // CACHE LAYER 1: Check Redis
        try {
            const cached = await TileCache.get(tileSource, zoom, tileX, tileY);

            if (cached) {
                const cacheTime = Date.now() - startTime;
                console.log(`[TileCache] HIT ${tileSource}/${z}/${x}/${y} (${cacheTime}ms)`);

                return new NextResponse(new Uint8Array(cached.data), {
                    status: 200,
                    headers: {
                        'Content-Type': cached.contentType,
                        'Cache-Control': 'public, max-age=604800, immutable', // 7 days browser cache
                        'X-Cache-Status': 'HIT',
                        'X-Cache-Time': `${cacheTime}ms`,
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
        } catch (redisError) {
            // Redis failure should not break tile serving - log and continue to upstream
            console.error(`[TileCache] Redis error for ${tileSource}/${z}/${x}/${y}:`, redisError);
        }

        // CACHE MISS: Fetch from upstream
        const sourceConfig = TILE_SOURCES[tileSource];

        // Handle subdomain placeholder for load balancing (CartoDB uses a, b, c, d)
        const subdomain = ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)];

        const upstreamUrl = sourceConfig.url
            .replace('{s}', subdomain)
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);

        console.log(`[TileCache] MISS ${tileSource}/${z}/${x}/${y} - Fetching from upstream`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), sourceConfig.timeout);

        try {
            const upstreamResponse = await fetch(upstreamUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'AUS.MAPPING/1.0 (Tile Cache Proxy)',
                },
            });

            clearTimeout(timeoutId);

            if (!upstreamResponse.ok) {
                console.error(
                    `[TileCache] Upstream error ${upstreamResponse.status} for ${tileSource}/${z}/${x}/${y}`
                );
                return new NextResponse('Tile not found', { status: upstreamResponse.status });
            }

            // Get tile data as buffer
            const arrayBuffer = await upstreamResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType =
                upstreamResponse.headers.get('content-type') || sourceConfig.contentType;

            // Store in Redis asynchronously (don't block response)
            TileCache.set(tileSource, zoom, tileX, tileY, buffer, contentType).catch((err) => {
                console.error(`[TileCache] Failed to cache ${tileSource}/${z}/${x}/${y}:`, err);
            });

            const totalTime = Date.now() - startTime;
            console.log(`[TileCache] STORED ${tileSource}/${z}/${x}/${y} (${totalTime}ms)`);

            return new NextResponse(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=604800, immutable', // 7 days browser cache
                    'X-Cache-Status': 'MISS',
                    'X-Cache-Time': `${totalTime}ms`,
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error(`[TileCache] Timeout fetching ${tileSource}/${z}/${x}/${y}`);
                return new NextResponse('Tile request timeout', { status: 504 });
            }

            console.error(`[TileCache] Fetch error for ${tileSource}/${z}/${x}/${y}:`, fetchError);
            return new NextResponse('Failed to fetch tile', { status: 502 });
        }
    } catch (error) {
        console.error('[TileCache] Unexpected error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

// Preflight CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
