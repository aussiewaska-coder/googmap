export const AUSTRALIA_CENTER = {
    lng: 120.953100,
    lat: -27.946800,
    zoom: 3.92,
    pitch: 0,
    bearing: 0,
} as const;

export const CITIES = {
    Sydney: [151.2093, -33.8688],
    Melbourne: [144.9631, -37.8136],
    Brisbane: [153.0251, -27.4698],
    Perth: [115.8605, -31.9505],
    Adelaide: [138.6007, -34.9285],
    Hobart: [147.3272, -42.8821],
    Darwin: [130.8456, -12.4634],
    Canberra: [149.1304, -35.2809],
} as const;

// Use our cached tile proxy for blazing fast loading
// Tiles are cached in Redis server-side and browser-side for optimal performance
const TILE_PROXY_BASE = process.env.NEXT_PUBLIC_TILE_PROXY_URL || '';

export const MAP_SOURCES = {
    satellite: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/satellite/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics',
    } as const,
    terrain: {
        type: 'raster-dem',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/terrain/{z}/{x}/{y}`,
        ],
        encoding: 'terrarium',
        tileSize: 256,
        attribution: 'Mapzen, AWS Open Data',
    } as const,
    streets: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/streets/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
    } as const,
    topo: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/topo/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: 'Esri',
    } as const,
    dark: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/dark/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© CARTO, © OpenStreetMap contributors',
    } as const,
    voyager: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/voyager/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© CARTO, © OpenStreetMap contributors',
    } as const,
    labels: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/labels/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: 'Esri',
    } as const,
    // Tactical Map Sources (specialized/alternative maps)
    opentopo: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/opentopo/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© OpenTopoMap contributors',
    } as const,
    cyclosm: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/cyclosm/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© CyclOSM, © OpenStreetMap contributors',
    } as const,
    usgs_imagery: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/usgs_imagery/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: 'USGS',
    } as const,
    usgs_topo: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/usgs_topo/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: 'USGS',
    } as const,
    openseamap: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/openseamap/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© OpenSeaMap contributors',
    } as const,
    mtbmap: {
        type: 'raster',
        tiles: [
            `${TILE_PROXY_BASE}/api/tiles/mtbmap/{z}/{x}/{y}`,
        ],
        tileSize: 256,
        attribution: '© MTBMap.cz',
    } as const,
} as const;

export const MAP_STYLES = [
    {
        id: 'satellite',
        name: 'Satellite',
        description: 'High-resolution satellite imagery',
        baseLayer: 'satellite',
        showLabels: false,
        showTerrain: false,
        showHillshade: false,
        emoji: '🛰️',
    },
    {
        id: 'hybrid',
        name: 'Hybrid',
        description: 'Satellite with roads and labels',
        baseLayer: 'satellite',
        showLabels: true,
        showTerrain: false,
        showHillshade: false,
        emoji: '🗺️',
    },
    {
        id: 'streets',
        name: 'Streets',
        description: 'OpenStreetMap road network',
        baseLayer: 'streets',
        showLabels: false,
        showTerrain: false,
        showHillshade: false,
        emoji: '🚗',
    },
    {
        id: 'topo',
        name: 'Topographic',
        description: 'Detailed topographic map',
        baseLayer: 'topo',
        showLabels: false,
        showTerrain: false,
        showHillshade: false,
        emoji: '🗺️',
    },
    {
        id: 'tactical',
        name: 'Tactical Mode',
        description: 'Dark tactical theme',
        baseLayer: 'dark',
        showLabels: false,
        showTerrain: false,
        showHillshade: false,
        emoji: '🎯',
    },
    {
        id: 'voyager',
        name: 'Voyager',
        description: 'Clean modern basemap',
        baseLayer: 'voyager',
        showLabels: false,
        showTerrain: false,
        showHillshade: false,
        emoji: '🗺️',
    },
] as const;

// Tactical/Specialized Map Styles (collapsible section)
export const TACTICAL_MAP_STYLES = [
    {
        id: 'openseamap',
        name: 'OpenSeaMap',
        description: 'Nautical charts',
        baseLayer: 'openseamap',
        emoji: '⛵',
        comingSoon: false,
    },
    {
        id: 'usgs_imagery',
        name: 'USGS Imagery',
        description: 'USA only - Coming Soon',
        baseLayer: 'usgs_imagery',
        emoji: '🇺🇸',
        comingSoon: true,
    },
    {
        id: 'usgs_topo',
        name: 'USGS Topo',
        description: 'USA only - Coming Soon',
        baseLayer: 'usgs_topo',
        emoji: '🗺️',
        comingSoon: true,
    },
    {
        id: 'opentopo',
        name: 'OpenTopo',
        description: 'Coming Soon',
        baseLayer: 'opentopo',
        emoji: '🏔️',
        comingSoon: true,
    },
    {
        id: 'mtbmap',
        name: 'MTBMap',
        description: 'Coming Soon',
        baseLayer: 'mtbmap',
        emoji: '🚵',
        comingSoon: true,
    },
] as const;
