-- Generate unique 8-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_unique_code(table_name TEXT, column_name TEXT)
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(8) := '';
  i INTEGER;
  exists_flag BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', table_name, column_name)
    INTO exists_flag USING result;

    IF NOT exists_flag THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-create default report types and statuses for new company
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Default report types
  INSERT INTO report_types (company_id, type_name, type_name_en, type_name_ja, type_name_zh, display_order) VALUES
    (NEW.id, '부정행위', 'Fraud', '不正行為', '欺诈行为', 1),
    (NEW.id, '횡령/배임', 'Embezzlement', '横領・背任', '贪污/背信', 2),
    (NEW.id, '직장 내 괴롭힘', 'Workplace Harassment', '職場いじめ', '职场霸凌', 3),
    (NEW.id, '성희롱/성폭력', 'Sexual Harassment', 'セクシャルハラスメント', '性骚扰/性暴力', 4),
    (NEW.id, '안전 위반', 'Safety Violation', '安全違反', '安全违规', 5),
    (NEW.id, '기타', 'Other', 'その他', '其他', 6);

  -- Default report statuses
  INSERT INTO report_statuses (company_id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal) VALUES
    (NEW.id, '접수대기', 'Pending', '受付待ち', '待受理', '#3b82f6', 1, true, false),
    (NEW.id, '접수보완', 'Needs Revision', '受付補完', '需补充', '#f59e0b', 2, false, false),
    (NEW.id, '접수완료', 'Accepted', '受付完了', '已受理', '#8b5cf6', 3, false, false),
    (NEW.id, '조사진행', 'Investigating', '調査進行', '调查中', '#ec4899', 4, false, false),
    (NEW.id, '조사완료', 'Investigation Complete', '調査完了', '调查完成', '#10b981', 5, false, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_setup_company_defaults
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION setup_company_defaults();

-- Updated_at auto-update function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_company_groups_updated_at BEFORE UPDATE ON company_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
