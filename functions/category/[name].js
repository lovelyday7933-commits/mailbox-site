/**
 * 카테고리 페이지 SSR: /category/:name
 * OG 메타태그를 카테고리별로 동적 생성
 */

const CATEGORY_LABELS = {
    love: '연애',
    work: '직장/학교',
    family: '가족',
    friend: '친구',
    health: '건강',
    general: '일반',
};

export async function onRequest(context) {
    const { params } = context;
    const categoryName = params.name;

    const label = CATEGORY_LABELS[categoryName];
    if (!label) {
        return Response.redirect('https://allnewstartday.com/', 302);
    }

    const title = `${label} 고민 - 마음우체통`;
    const description = `${label} 관련 고민들을 확인하고 따뜻한 답장을 남겨보세요.`;

    // index.html을 가져와서 OG 태그 수정
    const indexUrl = new URL('/index.html', context.request.url);
    const indexResponse = await fetch(indexUrl);

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
        .transform(indexResponse);
}
