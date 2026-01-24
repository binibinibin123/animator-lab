
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Initialize parser
const parser = new Parser({
    timeout: 5000,
    headers: {
        'User-Agent': 'Autopilot/1.0',
    },
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        const feed = await parser.parseURL(url);

        // Normalize and limit items to latest 5
        const items = feed.items.slice(0, 5).map(item => ({
            title: item.title || 'No Title',
            link: item.link,
            content: item.contentSnippet || item.content || '',
            pubDate: item.pubDate,
        }));

        return NextResponse.json({
            title: feed.title,
            description: feed.description,
            items
        });

    } catch (error: any) {
        console.error('[RSS Parser Error]', error);
        return NextResponse.json(
            { error: 'Failed to parse RSS feed', details: error.message },
            { status: 500 }
        );
    }
}
