-- User notification preferences per event type
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);

-- Event types:
-- new_report: 제보 접수 시
-- report_modified: 제보 수정 시 (내용 변경 있을 때만)
-- report_deleted: 제보 삭제 시
-- new_comment: 새 댓글 작성 시
-- comment_modified: 댓글 수정 시 (내용 변경 있을 때만)
-- comment_deleted: 댓글 삭제 시
