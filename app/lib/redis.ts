import Redis from 'ioredis';

// Singleton pattern - one Redis connection for the entire application lifecycle
let redis: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redis) {
        const redisUrl = process.env.REDIS_URL;

        if (!redisUrl) {
            throw new Error('REDIS_URL environment variable is not set');
        }

        // Create Redis client from URL
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err);
        });

        redis.on('connect', () => {
            console.log('[Redis] Client connected');
        });

        console.log('[Redis] Client initializing...');
    }

    return redis;
}

// Tile-specific caching utilities with cartographic optimization
export const TileCache = {
    /**
     * Generate cache key with version namespace for cache invalidation
     * Format: tile:v1:{source}:{z}:{x}:{y}
     */
    getKey(source: string, z: number, x: number, y: number): string {
        return `tile:v1:${source}:${z}:${x}:${y}`;
    },

    /**
     * Smart TTL based on zoom level and tile type
     * - Satellite imagery (high zoom): 30 days (changes infrequently)
     * - Satellite imagery (low zoom): 90 days (almost never changes)
     * - Terrain/elevation: 180 days (static data)
     * - Streets/roads: 14 days (road networks update regularly)
     * - Hybrid/labels: 14 days (place names/boundaries change)
     */
    getTTL(source: string, zoom: number): number {
        // Terrain/elevation data is static
        if (source.includes('terrain') || source.includes('elevation')) {
            return 60 * 60 * 24 * 180; // 180 days for static terrain
        }

        // Satellite imagery changes slowly
        if (source.includes('imagery') || source.includes('satellite')) {
            // Higher zoom = more detailed = more frequent updates
            if (zoom >= 15) return 60 * 60 * 24 * 30; // 30 days
            if (zoom >= 10) return 60 * 60 * 24 * 60; // 60 days
            return 60 * 60 * 24 * 90; // 90 days for world view
        }

        // Streets/roads update more frequently (new roads, changes)
        if (source.includes('streets') || source.includes('road')) {
            return 60 * 60 * 24 * 14; // 14 days
        }

        // Labels/boundaries update occasionally
        if (source.includes('hybrid') || source.includes('labels') || source.includes('boundaries')) {
            return 60 * 60 * 24 * 14; // 14 days
        }

        // Dark/Voyager themed maps (stable design)
        if (source.includes('dark') || source.includes('voyager') || source.includes('stamen')) {
            return 60 * 60 * 24 * 30; // 30 days
        }

        // Tactical maps (relatively stable)
        if (source.includes('opentopo') || source.includes('usgs') ||
            source.includes('openseamap') || source.includes('mtbmap')) {
            return 60 * 60 * 24 * 30; // 30 days for specialized maps
        }

        // Default: 7 days for other sources
        return 60 * 60 * 24 * 7;
    },

    /**
     * Store tile with compression metadata
     */
    async set(
        source: string,
        z: number,
        x: number,
        y: number,
        data: Buffer,
        contentType: string
    ): Promise<void> {
        const client = getRedisClient();
        const key = this.getKey(source, z, x, y);
        const ttl = this.getTTL(source, z);

        // Store as base64 encoded string for reliability across Redis versions
        const encoded = data.toString('base64');

        // Store tile data and metadata with TTL
        const pipeline = client.pipeline();
        pipeline.setex(key, ttl, encoded);
        pipeline.setex(`${key}:meta`, ttl, contentType);
        await pipeline.exec();
    },

    /**
     * Retrieve tile from cache
     */
    async get(
        source: string,
        z: number,
        x: number,
        y: number
    ): Promise<{ data: Buffer; contentType: string } | null> {
        const client = getRedisClient();
        const key = this.getKey(source, z, x, y);

        const pipeline = client.pipeline();
        pipeline.get(key);
        pipeline.get(`${key}:meta`);

        const results = await pipeline.exec();

        if (!results || results.length !== 2) {
            return null;
        }

        const [encodedResult, contentTypeResult] = results;
        const encoded = encodedResult?.[1] as string | null;
        const contentType = contentTypeResult?.[1] as string | null;

        if (!encoded || !contentType) {
            return null;
        }

        return {
            data: Buffer.from(encoded, 'base64'),
            contentType,
        };
    },

    /**
     * Batch prefetch - warm cache for adjacent tiles
     * Used for predictive caching based on user navigation patterns
     */
    async prefetch(
        source: string,
        z: number,
        x: number,
        y: number,
        radius: number = 1
    ): Promise<string[]> {
        const keys: string[] = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (dx === 0 && dy === 0) continue; // Skip center tile
                keys.push(this.getKey(source, z, x + dx, y + dy));
            }
        }

        return keys;
    },

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
    }> {
        const client = getRedisClient();

        // Get all tile keys (use SCAN in production for large datasets)
        const keys = await client.keys('tile:v1:*');

        // Get memory info if available
        let memoryUsage = 'N/A';
        try {
            const info = await client.info('memory');
            const match = info.match(/used_memory_human:([^\r\n]+)/);
            if (match) {
                memoryUsage = match[1];
            }
        } catch (err) {
            // Memory info not available or not permitted
        }

        return {
            totalKeys: keys.length,
            memoryUsage,
        };
    },
};
