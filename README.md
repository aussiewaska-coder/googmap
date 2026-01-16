# Australia MapLibre App

A production-ready MapLibre GL JS web application focused on Australia, built with Next.js App Router and deployed on Vercel.

## Features

- **3D Terrain**: Interactive 3D terrain using AWS Open Data Terrarium tiles and MapLibre's `raster-dem` source.
- **Imagery**: Esri World Imagery basemap.
- **Hillshading**: Dynamic hillshade layer based on terrain data.
- **Interactivity**:
    - Search for Australian locations (Nominatim).
    - FlyTo animations for major cities.
    - Click to drop markers and reverse geocode.
    - "Locate Me" functionality.
- **Tech Stack**: Next.js 14+ (App Router), MapLibre GL JS, Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- NPM

### Local Development

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

This project is optimized for Vercel.

1.  Push the code to a GitHub repository.
2.  Import the project in Vercel.
3.  The build settings should be automatically detected (Framework: Next.js).
4.  Deploy!

## Troubleshooting

-   **Blank Map**: Ensure your network allows connections to `services.arcgisonline.com` and `s3.amazonaws.com`. Check browser console for CSP errors.
-   **SSR Issues**: The map component is dynamically imported with `ssr: false` to avoid window is not defined errors.
-   **CORS**: WMS/Tile requests are generally handled by the browser. If you see CORS errors for APIs, check the serverless proxy implementations in `app/api/*`.

## Data Sources & Attribution

-   **Imagery**: Esri, Maxar, Earthstar Geographics, and the GIS User Community.
-   **Terrain**: Mapzen, AWS Open Data.
-   **Geocoding**: OpenStreetMap / Nominatim.

## Performance

-   **Dynamic Imports**: `maplibre-gl` is heavy, so we load it only on the client.
-   **Debouncing**: Search inputs could be debounced further for high-traffic production use.
-   **Layer Visibility**: Toggling layers updates `visibility` rather than rebuilding sources to minimize performance cost.
