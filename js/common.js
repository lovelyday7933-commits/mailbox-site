/**
 * 마음우체통 - 공통 유틸리티 (Supabase 버전)
 * 기존 fetch API → Supabase JS SDK
 */

// ============ 고민글 API ============

const confessionAPI = {
    // 목록 조회
    async list(params = {}) {
        const page = params.page || 1;
        const perPage = params.per_page || 20;
        const category = params.category;
        const sort = params.sort || 'latest';

        let query = supabaseClient
            .from('confessions')
            .select('*', { count: 'exact' });

        if (category) {
            query = query.eq('category', category);
        }

        if (sort === 'popular') {
            query = query.order('like_count', { ascending: false })
                         .order('reply_count', { ascending: false });
        } else if (sort === 'unanswered') {
            query = query.eq('reply_count', 0)
                         .order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const offset = (page - 1) * perPage;
        query = query.range(offset, offset + perPage - 1);

        const { data, count, error } = await query;
        if (error) throw new Error(error.message);

        return {
            success: true,
            data: data || [],
            meta: {
                page,
                per_page: perPage,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / perPage)
            }
        };
    },

    // 상세 조회
    async get(id) {
        // 조회수 증가
        await supabaseClient.rpc('increment_view', { p_confession_id: id });

        // 고민글 조회
        const { data: confession, error } = await supabaseClient
            .from('confessions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error('고민을 찾을 수 없어요');

        // 답장 조회
        const { data: replies } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('confession_id', id)
            .order('is_best', { ascending: false })
            .order('like_count', { ascending: false })
            .order('created_at', { ascending: true });

        confession.replies = replies || [];
        confession.is_mine = confession.session_id === SESSION_ID;

        return { success: true, data: confession };
    },

    // 작성
    async create(data) {
        const confessionId = generateId();

        const { error } = await supabaseClient.rpc('create_confession', {
            p_id: confessionId,
            p_session_id: SESSION_ID,
            p_content: data.content,
            p_category: data.category || 'general',
            p_title: data.title || null,
            p_emoji: data.emoji || '💌'
        });

        if (error) throw new Error(error.message);

        return {
            success: true,
            data: { id: confessionId },
            message: '고민이 우체통에 담겼어요. 답장을 기다려주세요!'
        };
    },

    // 랜덤 (답장하기용)
    async random() {
        const { data, error } = await supabaseClient.rpc('get_random_confession', {
            p_session_id: SESSION_ID
        });

        if (error || !data || data.length === 0) {
            throw new Error('답장을 기다리는 고민이 없어요');
        }

        return { success: true, data: data[0] };
    },
};

// ============ 답장 API ============

const replyAPI = {
    async create(confessionId, content) {
        const replyId = generateId();

        const { error } = await supabaseClient.rpc('create_reply', {
            p_id: replyId,
            p_confession_id: confessionId,
            p_session_id: SESSION_ID,
            p_content: content
        });

        if (error) {
            if (error.message.includes('cannot_reply_own')) {
                throw new Error('본인 고민에는 답장할 수 없어요');
            }
            throw new Error(error.message);
        }

        return {
            success: true,
            data: { id: replyId },
            message: '따뜻한 답장이 전달되었어요!'
        };
    },
};

// ============ 공감 API ============

const likeAPI = {
    async toggle(type, id) {
        const { data, error } = await supabaseClient.rpc('toggle_like', {
            p_session_id: SESSION_ID,
            p_target_type: type,
            p_target_id: id
        });

        if (error) throw new Error(error.message);

        return { success: true, data: { liked: data } };
    },
};

// ============ 내 우체통 API ============

const myAPI = {
    async confessions() {
        const { data, error } = await supabaseClient
            .from('confessions')
            .select('*')
            .eq('session_id', SESSION_ID)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // new_replies 계산 (reply_count와 동일)
        const enriched = (data || []).map(c => ({
            ...c,
            new_replies: c.reply_count
        }));

        return { success: true, data: enriched };
    },

    async replies() {
        // 내 답장 + 원본 고민 내용
        const { data, error } = await supabaseClient
            .from('replies')
            .select('*, confessions!inner(content, emoji)')
            .eq('session_id', SESSION_ID)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // 기존 API 형태로 변환
        const transformed = (data || []).map(r => ({
            ...r,
            confession_content: r.confessions?.content,
            emoji: r.confessions?.emoji,
            confessions: undefined
        }));

        return { success: true, data: transformed };
    },
};

// ============ 통계 API ============

const statsAPI = {
    async get() {
        const { count: totalConfessions } = await supabaseClient
            .from('confessions')
            .select('*', { count: 'exact', head: true });

        const { count: totalReplies } = await supabaseClient
            .from('replies')
            .select('*', { count: 'exact', head: true });

        const { count: answered } = await supabaseClient
            .from('confessions')
            .select('*', { count: 'exact', head: true })
            .gt('reply_count', 0);

        const rate = totalConfessions > 0
            ? Math.round((answered / totalConfessions) * 1000) / 10
            : 0;

        return {
            success: true,
            data: {
                total_confessions: totalConfessions || 0,
                total_replies: totalReplies || 0,
                answered_rate: rate
            }
        };
    },
};

// ============ 콘텐츠 트래킹 ============

async function trackContentUsage(type, id, name) {
    try {
        await supabaseClient.rpc('track_content', {
            p_id: generateId(),
            p_type: type,
            p_content_id: id,
            p_content_name: name,
            p_session_id: SESSION_ID
        });
    } catch (e) {
        console.log('Track error:', e);
    }
}

// ============ 유틸리티 ============

// 시간 포맷
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
    });
}

// 숫자 포맷 (1000 -> 1K)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// 카테고리 라벨
const CATEGORIES = {
    general: '일반',
    love: '연애',
    work: '직장/학교',
    family: '가족',
    friend: '친구',
    health: '건강',
};

function getCategoryLabel(category) {
    return CATEGORIES[category] || category;
}

// 텍스트 자르기
function truncate(text, length = 100) {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
}

// ============ 토스트 메시지 ============

let toastTimer = null;

function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ============ 로딩 표시 ============

function showLoading(container) {
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function showEmpty(container, icon = '📭', title = '아직 비어있어요', message = '') {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// ============ 이벤트 ============

// 디바운스
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 무한 스크롤
function setupInfiniteScroll(callback) {
    const handleScroll = debounce(() => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;

        if (scrollTop + windowHeight >= docHeight - 200) {
            callback();
        }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
}

// ============ 터치 피드백 ============

function addTouchFeedback(element) {
    element.addEventListener('touchstart', () => {
        element.style.transform = 'scale(0.98)';
    });

    element.addEventListener('touchend', () => {
        element.style.transform = '';
    });
}

// ============ 페이지 이동 ============

function goTo(url) {
    window.location.href = url;
}

function goBack() {
    if (document.referrer) {
        history.back();
    } else {
        goTo('/');
    }
}
