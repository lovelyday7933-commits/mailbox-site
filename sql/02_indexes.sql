-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX idx_confessions_category ON confessions(category);
CREATE INDEX idx_confessions_session_id ON confessions(session_id);
CREATE INDEX idx_confessions_like_count ON confessions(like_count DESC);
CREATE INDEX idx_confessions_reply_count ON confessions(reply_count);

CREATE INDEX idx_replies_confession_id ON replies(confession_id);
CREATE INDEX idx_replies_session_id ON replies(session_id);
CREATE INDEX idx_replies_created_at ON replies(created_at DESC);

CREATE INDEX idx_likes_session_target ON likes(session_id, target_type, target_id);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);

CREATE INDEX idx_content_usage_type_id ON content_usage(content_type, content_id);
CREATE INDEX idx_content_usage_created_at ON content_usage(created_at);
