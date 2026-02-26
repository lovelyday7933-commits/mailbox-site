/**
 * 동적 사이트맵: /sitemap.xml
 * 정적 페이지 + 개별 고민 페이지
 */

export async function onRequest(context) {
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const BASE_URL = 'https://allnewstartday.com';

    // 정적 페이지 목록
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/write', priority: '0.8', changefreq: 'monthly' },
        { url: '/reply', priority: '0.8', changefreq: 'monthly' },
        { url: '/my', priority: '0.6', changefreq: 'daily' },
        { url: '/popular', priority: '0.7', changefreq: 'daily' },
        { url: '/play', priority: '0.6', changefreq: 'monthly' },
        { url: '/tests', priority: '0.5', changefreq: 'monthly' },
        { url: '/games', priority: '0.5', changefreq: 'monthly' },
    ];

    let dynamicUrls = '';

    // Supabase에서 고민글 목록 조회
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/confessions?select=id,created_at&order=created_at.desc&limit=500`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    }
                }
            );

            const confessions = await response.json();

            if (Array.isArray(confessions)) {
                dynamicUrls = confessions.map(c => `
    <url>
        <loc>${BASE_URL}/concern/${c.id}</loc>
        <lastmod>${new Date(c.created_at).toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`).join('');
            }
        } catch (error) {
            console.error('Sitemap fetch error:', error);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `    <url>
        <loc>${BASE_URL}${p.url}</loc>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
    </url>`).join('\n')}
${dynamicUrls}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
        }
    });
}
