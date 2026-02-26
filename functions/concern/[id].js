/**
 * SEO용 SSR: /concern/:id
 * Cloudflare Pages Function (HTMLRewriter)
 *
 * 고민 상세 페이지의 OG 메타태그를 동적으로 삽입하여
 * 카카오톡, 페이스북 등 공유 시 미리보기가 올바르게 표시되도록 함
 */

export async function onRequest(context) {
    const { params, env } = context;
    const confessionId = params.id;

    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // 환경변수 없으면 정적 페이지로 폴백
        return context.next();
    }

    try {
        // Supabase REST API로 고민글 조회
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/confessions?id=eq.${confessionId}&select=id,content,category,emoji,reply_count,like_count,created_at`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
            }
        );

        const data = await response.json();

        if (!data || data.length === 0) {
            // 없는 고민이면 홈으로 리다이렉트
            return Response.redirect('https://allnewstartday.com/', 302);
        }

        const confession = data[0];
        const preview = confession.content.substring(0, 100).replace(/"/g, '&quot;');
        const title = `${confession.emoji || '💌'} 마음우체통 - 익명 고민`;
        const description = preview + (confession.content.length > 100 ? '...' : '');
        const url = `https://allnewstartday.com/concern/${confessionId}`;

        // detail.html을 가져와서 OG 태그 수정
        const detailUrl = new URL('/detail.html', context.request.url);
        const detailResponse = await fetch(detailUrl);

        return new HTMLRewriter()
            .on('meta[property="og:title"]', {
                element(element) {
                    element.setAttribute('content', title);
                }
            })
            .on('meta[property="og:description"]', {
                element(element) {
                    element.setAttribute('content', description);
                }
            })
            .on('meta[property="og:url"]', {
                element(element) {
                    element.setAttribute('content', url);
                }
            })
            .on('meta[property="og:type"]', {
                element(element) {
                    element.setAttribute('content', 'article');
                }
            })
            .on('meta[name="description"]', {
                element(element) {
                    element.setAttribute('content', description);
                }
            })
            .on('title', {
                element(element) {
                    element.setInnerContent(title);
                }
            })
            .transform(detailResponse);

    } catch (error) {
        console.error('SSR Error:', error);
        return context.next();
    }
}
