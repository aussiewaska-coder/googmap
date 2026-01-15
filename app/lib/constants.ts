export const AUSTRALIA_CENTER = {
    lng: 133.7751,
    lat: -25.2744,
    zoom: 4,
    pitch: 65,
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

export const MAP_SOURCES = {
    imagery: {
        type: 'raster',
        tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics',
    } as const,
    terrain: {
        type: 'raster-dem',
        tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        ],
        encoding: 'terrarium',
        tileSize: 256,
        attribution: 'Mapzen, AWS Open Data',
    } as const,
} as const;
