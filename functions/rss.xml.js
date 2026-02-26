/**
 * 동적 RSS 피드: /rss.xml
 * 최신 고민글 50개를 RSS로 제공
 */

export async function onRequest(context) {
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const BASE_URL = 'https://allnewstartday.com';

    let items = '';

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/confessions?select=id,content,category,emoji,created_at&order=created_at.desc&limit=50`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    }
                }
            );

            const confessions = await response.json();

            if (Array.isArray(confessions)) {
                items = confessions.map(c => {
                    const preview = c.content.substring(0, 200).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const categoryLabels = { love: '연애', work: '직장/학교', family: '가족', friend: '친구', health: '건강', general: '일반' };
                    const category = categoryLabels[c.category] || c.category;

                    return `
        <item>
            <title>${c.emoji || '💌'} ${category} 고민</title>
            <link>${BASE_URL}/concern/${c.id}</link>
            <description><![CDATA[${preview}]]></description>
            <pubDate>${new Date(c.created_at).toUTCString()}</pubDate>
            <guid>${BASE_URL}/concern/${c.id}</guid>
            <category>${category}</category>
        </item>`;
                }).join('');
            }
        } catch (error) {
            console.error('RSS fetch error:', error);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>마음우체통 - 익명 고민상담</title>
        <link>${BASE_URL}</link>
        <description>익명으로 고민을 털어놓고 따뜻한 답장을 받아보세요</description>
        <language>ko</language>
        <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
    </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml',
            'Cache-Control': 'public, max-age=3600',
        }
    });
}
