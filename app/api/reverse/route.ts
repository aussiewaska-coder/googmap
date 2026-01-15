import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lng = searchParams.get('lng');
    const lat = searchParams.get('lat');

    console.log(`[API] /api/reverse - Request received. Lng: ${lng}, Lat: ${lat}`);

    if (!lng || !lat) {
        console.warn('[API] /api/reverse - Missing lng/lat parameters');
        return NextResponse.json({ error: 'Parameters "lng" and "lat" are required' }, { status: 400 });
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        console.log(`[API] /api/reverse - Fetching from Nominatim: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AustraliaMapApp/1.0 (contact@example.com)',
            },
        }
        );

        console.log(`[API] /api/reverse - Nominatim response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[API] /api/reverse - Success. Display name: ${data.display_name?.substring(0, 50)}...`);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] /api/reverse - Error:', error);
        return NextResponse.json({ error: 'Failed to fetch reverse geocode data' }, { status: 500 });
    }
}
