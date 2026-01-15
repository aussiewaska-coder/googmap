import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    console.log(`[API] /api/geocode - Request received. Query: "${query}"`);

    if (!query) {
        console.warn('[API] /api/geocode - Missing query parameter "q"');
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
        console.log(`[API] /api/geocode - Fetching from Nominatim: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AustraliaMapApp/1.0 (contact@example.com)',
            },
        }
        );

        console.log(`[API] /api/geocode - Nominatim response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[API] /api/geocode - Found ${data.length} results`);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] /api/geocode - Error:', error);
        return NextResponse.json({ error: 'Failed to fetch geocode data' }, { status: 500 });
    }
}
