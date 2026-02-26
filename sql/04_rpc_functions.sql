-- ============================================
-- RPC 함수 (SECURITY DEFINER = RLS 우회)
-- 프론트엔드에서 supabase.rpc('함수명', {파라미터}) 호출
-- ============================================

-- 1. 고민글 작성
CREATE OR REPLACE FUNCTION create_confession(
    p_id TEXT,
    p_session_id TEXT,
    p_content TEXT,
    p_category TEXT DEFAULT 'general',
    p_title TEXT DEFAULT NULL,
    p_emoji TEXT DEFAULT '💌'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO confessions (id, session_id, content, category, title, emoji)
    VALUES (p_id, p_session_id, p_content, p_category, p_title, p_emoji);

    -- 세션 통계 업데이트
    INSERT INTO sessions (id, confession_count, last_active)
    VALUES (p_session_id, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
        confession_count = sessions.confession_count + 1,
        last_active = NOW();

    RETURN p_id;
END;
$$;

-- 2. 답장 작성
CREATE OR REPLACE FUNCTION create_reply(
    p_id TEXT,
    p_confession_id TEXT,
    p_session_id TEXT,
    p_content TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owner TEXT;
BEGIN
    -- 본인 글 답장 방지
    SELECT session_id INTO v_owner FROM confessions WHERE id = p_confession_id;
    IF v_owner = p_session_id THEN
        RAISE EXCEPTION 'cannot_reply_own';
    END IF;

    INSERT INTO replies (id, confession_id, session_id, content)
    VALUES (p_id, p_confession_id, p_session_id, p_content);

    -- 고민글 답장 수 증가 + 답장됨 표시
    UPDATE confessions
    SET reply_count = reply_count + 1, is_answered = 1
    WHERE id = p_confession_id;

    -- 세션 통계 업데이트
    INSERT INTO sessions (id, reply_count, last_active)
    VALUES (p_session_id, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
        reply_count = sessions.reply_count + 1,
        last_active = NOW();

    RETURN p_id;
END;
$$;

-- 3. 공감 토글
CREATE OR REPLACE FUNCTION toggle_like(
    p_session_id TEXT,
    p_target_type TEXT,
    p_target_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing TEXT;
    v_liked BOOLEAN;
    v_table TEXT;
BEGIN
    -- 기존 공감 확인
    SELECT id INTO v_existing FROM likes
    WHERE session_id = p_session_id AND target_type = p_target_type AND target_id = p_target_id;

    IF v_existing IS NOT NULL THEN
        -- 공감 취소
        DELETE FROM likes WHERE id = v_existing;
        v_liked := FALSE;

        -- 카운트 감소
        IF p_target_type = 'confession' THEN
            UPDATE confessions SET like_count = like_count - 1 WHERE id = p_target_id;
        ELSE
            UPDATE replies SET like_count = like_count - 1 WHERE id = p_target_id;
        END IF;
    ELSE
        -- 공감 추가
        INSERT INTO likes (id, session_id, target_type, target_id)
        VALUES (substr(gen_random_uuid()::text, 1, 8), p_session_id, p_target_type, p_target_id);
        v_liked := TRUE;

        -- 카운트 증가
        IF p_target_type = 'confession' THEN
            UPDATE confessions SET like_count = like_count + 1 WHERE id = p_target_id;
        ELSE
            UPDATE replies SET like_count = like_count + 1 WHERE id = p_target_id;
        END IF;
    END IF;

    RETURN v_liked;
END;
$$;

-- 4. 조회수 증가
CREATE OR REPLACE FUNCTION increment_view(p_confession_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE confessions SET view_count = view_count + 1 WHERE id = p_confession_id;
END;
$$;

-- 5. 랜덤 고민 (답장하기용)
CREATE OR REPLACE FUNCTION get_random_confession(p_session_id TEXT)
RETURNS SETOF confessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM confessions
    WHERE session_id != p_session_id AND reply_count < 10
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$;

-- 6. 콘텐츠 사용 기록
CREATE OR REPLACE FUNCTION track_content(
    p_id TEXT,
    p_type TEXT,
    p_content_id TEXT,
    p_content_name TEXT,
    p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO content_usage (id, content_type, content_id, content_name, session_id)
    VALUES (p_id, p_type, p_content_id, p_content_name, p_session_id);
END;
$$;

-- 7. 관리자 로그인 확인
CREATE OR REPLACE FUNCTION admin_login(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    RETURN v_stored = p_password;
END;
$$;

-- 8. 관리자 대시보드
CREATE OR REPLACE FUNCTION admin_dashboard(p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
    v_result JSON;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    IF v_stored IS DISTINCT FROM p_password THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT json_build_object(
        'stats', json_build_object(
            'total_confessions', (SELECT COUNT(*) FROM confessions),
            'total_replies', (SELECT COUNT(*) FROM replies),
            'total_likes', (SELECT COUNT(*) FROM likes),
            'total_users', (SELECT COUNT(DISTINCT session_id) FROM (
                SELECT session_id FROM confessions UNION SELECT session_id FROM replies
            ) u),
            'today_confessions', (SELECT COUNT(*) FROM confessions WHERE created_at::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date),
            'today_replies', (SELECT COUNT(*) FROM replies WHERE created_at::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date)
        ),
        'recent_confessions', (
            SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
            FROM (SELECT id, content, category, created_at, reply_count, like_count FROM confessions ORDER BY created_at DESC LIMIT 5) c
        ),
        'recent_replies', (
            SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
            FROM (
                SELECT r.id, r.content, r.created_at, c.content as confession_content
                FROM replies r JOIN confessions c ON r.confession_id = c.id
                ORDER BY r.created_at DESC LIMIT 5
            ) r
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 9. 관리자: 고민 삭제
CREATE OR REPLACE FUNCTION admin_delete_confession(p_password TEXT, p_confession_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    IF v_stored IS DISTINCT FROM p_password THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- 관련 좋아요 삭제
    DELETE FROM likes WHERE target_type = 'confession' AND target_id = p_confession_id;
    DELETE FROM likes WHERE target_type = 'reply' AND target_id IN (
        SELECT id FROM replies WHERE confession_id = p_confession_id
    );
    -- 답장 삭제 (CASCADE로 자동 처리되지만 명시)
    DELETE FROM replies WHERE confession_id = p_confession_id;
    -- 고민 삭제
    DELETE FROM confessions WHERE id = p_confession_id;

    RETURN TRUE;
END;
$$;

-- 10. 관리자: 답장 삭제
CREATE OR REPLACE FUNCTION admin_delete_reply(p_password TEXT, p_reply_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
    v_confession_id TEXT;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    IF v_stored IS DISTINCT FROM p_password THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT confession_id INTO v_confession_id FROM replies WHERE id = p_reply_id;

    IF v_confession_id IS NOT NULL THEN
        DELETE FROM likes WHERE target_type = 'reply' AND target_id = p_reply_id;
        DELETE FROM replies WHERE id = p_reply_id;
        UPDATE confessions SET reply_count = reply_count - 1 WHERE id = v_confession_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- 11. 관리자: 콘텐츠 통계
CREATE OR REPLACE FUNCTION admin_content_stats(p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
    v_result JSON;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    IF v_stored IS DISTINCT FROM p_password THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT json_build_object(
        'total_tests', (SELECT COUNT(*) FROM content_usage WHERE content_type = 'test'),
        'total_games', (SELECT COUNT(*) FROM content_usage WHERE content_type = 'game'),
        'today_tests', (SELECT COUNT(*) FROM content_usage WHERE content_type = 'test' AND created_at::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date),
        'today_games', (SELECT COUNT(*) FROM content_usage WHERE content_type = 'game' AND created_at::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date),
        'test_stats', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (SELECT content_id, content_name, COUNT(*) as count FROM content_usage WHERE content_type = 'test' GROUP BY content_id, content_name ORDER BY count DESC) t
        ),
        'game_stats', (
            SELECT COALESCE(json_agg(row_to_json(g)), '[]'::json)
            FROM (SELECT content_id, content_name, COUNT(*) as count FROM content_usage WHERE content_type = 'game' GROUP BY content_id, content_name ORDER BY count DESC) g
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 12. 관리자: 고민 목록 (페이지네이션)
CREATE OR REPLACE FUNCTION admin_confessions(p_password TEXT, p_page INT DEFAULT 1, p_per_page INT DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored TEXT;
    v_offset INT;
    v_total INT;
    v_result JSON;
BEGIN
    SELECT value INTO v_stored FROM settings WHERE key = 'admin_password';
    IF v_stored IS DISTINCT FROM p_password THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    v_offset := (p_page - 1) * p_per_page;
    SELECT COUNT(*) INTO v_total FROM confessions;

    SELECT json_build_object(
        'data', (
            SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
            FROM (SELECT * FROM confessions ORDER BY created_at DESC LIMIT p_per_page OFFSET v_offset) c
        ),
        'meta', json_build_object(
            'page', p_page,
            'per_page', p_per_page,
            'total', v_total,
            'total_pages', CEIL(v_total::float / p_per_page)
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
