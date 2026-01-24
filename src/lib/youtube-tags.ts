
export async function getRealTags(seedKeyword: string, language: string = 'en'): Promise<string[]> {
    try {
        const hl = language === 'Korean' || language === 'ko' ? 'ko' : 'en';
        const url = `http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(seedKeyword)}&hl=${hl}`;

        const response = await fetch(url);
        const text = await response.text();

        // Response is JSONP: window.google.ac.h(["query", ["sugg1", "sugg2", ...]])
        // or just: ["query", ["sugg1", "sugg2", ...]]

        // Extract the JSON array part
        const match = text.match(/\[.*\]/);
        if (!match) return [];

        const jsonStr = match[0];
        const data = JSON.parse(jsonStr);

        // data[1] contains the suggestions array
        if (Array.isArray(data) && data[1]) {
            return data[1].map((item: any) => {
                // item is usually ["suggestion", class, type...]
                return Array.isArray(item) ? item[0] : item;
            }).slice(0, 10); // Top 10
        }

        return [];
    } catch (error) {
        console.error(`[YouTubeTags] Error fetching tags for ${seedKeyword}:`, error);
        return [];
    }
}
