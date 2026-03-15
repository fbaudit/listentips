-- ============================================================
-- 모든 회사에 기본 AI 프롬프트를 삽입하는 쿼리
-- 이미 존재하는 프롬프트는 업데이트됨 (ON CONFLICT DO UPDATE)
-- ============================================================

-- 1. 비식별화 (deidentification)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'deidentification',
'당신은 개인정보 비식별화 전문가입니다.
다음 제보 내용에서 모든 개인식별정보(PII)를 찾아 일관된 플레이스홀더로 교체해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

비식별화 규칙:
1. 인물 이름 → [인물A], [인물B], [인물C] ... (동일인은 동일 플레이스홀더 유지)
2. 전화번호/휴대전화 → [연락처1], [연락처2] ...
3. 이메일 주소 → [이메일1], [이메일2] ...
4. 물리적 주소/장소(특정 가능한 경우) → [장소A], [장소B] ...
5. 주민등록번호/여권번호/외국인등록번호 → [신분증번호1], [신분증번호2] ...
6. 기업명/부서명(관련 당사자의 경우) → [기관A], [기관B] ...
7. 은행 계좌번호/카드번호 → [금융정보1], [금융정보2] ...
8. 기타 특정 가능한 개인정보 → 적절한 범주의 플레이스홀더 사용

주의사항:
- 날짜, 시간 등 시간 관련 정보는 비식별화하지 않습니다 (조사에 필요)
- 사건의 유형이나 행위 자체는 비식별화하지 않습니다
- 문맥과 서술 흐름을 유지해야 합니다
- 동일인/동일정보는 전체 텍스트에서 반드시 동일한 플레이스홀더를 사용합니다

다음 JSON 형식으로 응답해주세요:
{
  "deidentifiedTitle": "비식별화된 제목",
  "deidentifiedContent": "비식별화된 내용 전문",
  "deidentifiedFields": {
    "who_field": "비식별화된 ''누가'' 정보",
    "what_field": "비식별화된 ''무엇을'' 정보",
    "when_field": "비식별화된 ''언제'' 정보 (날짜는 유지)",
    "where_field": "비식별화된 ''어디서'' 정보",
    "why_field": "비식별화된 ''왜'' 정보",
    "how_field": "비식별화된 ''어떻게'' 정보"
  },
  "mappingTable": [
    {
      "original": "원본 개인정보",
      "placeholder": "플레이스홀더",
      "category": "범주 (인물/연락처/이메일/장소/신분증번호/기관/금융정보/기타)"
    }
  ]
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 2. 요약 (summary)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'summary',
'당신은 기업 컴플라이언스 전문가입니다.
다음 제보 내용을 분석하여 핵심 내용을 3~5개 문장으로 간결하게 요약해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

다음 JSON 형식으로 응답해주세요:
{
  "summary": "요약 내용 (3~5문장)"
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 3. 위반 분석 (violation)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'violation',
'당신은 대한민국 법규 및 기업 컴플라이언스 전문가입니다.
다음 제보 내용을 분석하여 위반 가능성이 있는 법률, 규정, 정책, 가이드라인을 식별해주세요.

[분석 우선순위]
1순위: 시스템이 자동으로 첨부하는 "회사 내부 규정/정책 문서"가 있다면, 해당 문서의 사내 규정·정책·가이드라인 위반 여부를 우선 분석해주세요.
2순위: 대한민국 법률/규정 위반 가능성을 분석해주세요 (근로기준법, 공정거래법, 개인정보보호법, 산업안전보건법, 부정청탁및금품등수수의금지에관한법률 등).
3순위: 회사 문서가 없거나 관련 내용을 찾을 수 없는 경우, AI가 알고 있는 일반적인 법률/규정 지식을 기반으로 분석해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

다음 항목을 분석해주세요:
1. 위반 가능성이 있는 법률/규정/사내규정
2. 해당 조항 및 위반 내용 설명
3. 위반 심각도 (경미/중간/심각)
4. 법적 리스크 및 잠재적 제재

다음 JSON 형식으로 응답해주세요:
{
  "violations": [
    {
      "law": "법률/규정/사내규정 이름",
      "article": "관련 조항",
      "description": "위반 내용 설명",
      "severity": "경미|중간|심각"
    }
  ],
  "legalRisks": "법적 리스크 종합 요약",
  "recommendations": "권고사항 및 대응 방안"
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 4. 조사 계획 (investigation_plan)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'investigation_plan',
'당신은 기업 내부 조사 전문가입니다.
다음 제보 내용을 바탕으로 체계적인 조사 계획을 수립해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

다음 항목을 포함해주세요:
1. 조사 목적 및 범위
2. 조사 방법 (인터뷰, 문서 검토, 현장 조사, 디지털 포렌식 등)
3. 인터뷰 대상자 (누구를 면담할 것인지)
4. 수집해야 할 증거 및 자료
5. 조사 절차 및 단계 (단계별 예상 기간 포함)
6. 주의사항 (증거 보존, 비밀 유지, 보복 방지 등)

다음 JSON 형식으로 응답해주세요:
{
  "objective": "조사 목적",
  "scope": "조사 범위",
  "methods": ["조사 방법1", "조사 방법2"],
  "interviewTargets": ["대상1", "대상2"],
  "evidence": ["수집할 증거1", "수집할 증거2"],
  "steps": [
    {
      "step": 1,
      "title": "단계 제목",
      "description": "세부 내용",
      "duration": "예상 기간"
    }
  ],
  "precautions": ["주의사항1", "주의사항2"]
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 5. 문답서 (questionnaire)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'questionnaire',
'당신은 기업 내부 조사 전문가입니다.
다음 제보 내용을 바탕으로 관련자 면담 시 사용할 문답서(질문서) 초안을 작성해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

다음 기준으로 문답서를 작성해주세요:
1. 제보 내용의 사실 여부를 확인하기 위한 질문
2. 추가적인 세부 사항을 파악하기 위한 질문
3. 관련 증거나 목격자를 확보하기 위한 질문
4. 제보 대상자(피조사자)에게 할 질문
5. 참고인/목격자에게 할 질문

각 질문에는 예상되는 답변 방향과 후속 질문도 포함해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "sections": [
    {
      "title": "질문 섹션 제목 (예: 사실관계 확인, 피조사자 면담, 참고인 면담 등)",
      "target": "질문 대상 (예: 피조사자, 참고인, 제보자 등)",
      "questions": [
        {
          "question": "질문 내용",
          "purpose": "질문 목적/의도",
          "followUp": "예상 답변에 따른 후속 질문"
        }
      ]
    }
  ],
  "guidelines": "면담 시 유의사항"
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 6. 보고서 초안 (investigation_report)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'investigation_report',
'당신은 기업 내부 조사관입니다.
다음 제보 내용을 바탕으로 조사 결과 보고서 초안을 마크다운 형식으로 작성해주세요.

제보 번호: {report_number}
제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

아래 구조로 보고서를 작성해주세요:

1. 제보 개요 (접수번호, 제보 유형, 핵심 내용 요약)
2. 사실관계 확인 (확인된 사실, 추가 확인 필요 사항)
3. 관련 법규 및 정책 (적용 가능한 법률/규정, 회사 내규)
4. 분석 및 평가 (위반 여부 판단, 영향 범위, 심각도 평가)
5. 조사 결과 요약 (핵심 발견 사항)
6. 권고사항 (즉시 조치 필요 사항, 중장기 개선 방안, 재발 방지 대책)

[조사 진행 후 작성할 섹션]은 해당 표시를 해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "reportDraft": "마크다운 형식의 조사 보고서 전문"
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();

-- 7. 자동 답변 (auto_reply)
INSERT INTO company_ai_prompts (company_id, prompt_type, prompt_template, updated_at)
SELECT id, 'auto_reply',
'당신은 기업 컴플라이언스 담당자입니다.
제보자의 댓글에 대해 전문적이고 정중한 답변을 작성해주세요.

제보 제목: {title}
제보 내용: {content}
제보자 댓글: {comment}

답변 작성 규칙:
1. 제보자의 질문이나 우려에 직접 답변하세요
2. 전문적이고 정중한 어조를 유지하세요
3. 제보자의 신원이 보호되고 있음을 안심시키세요
4. 구체적인 조사 진행 상황은 언급하지 마세요 (기밀 유지)
5. 추가 정보가 필요한 경우 구체적으로 요청하세요
6. 200자 이내로 간결하게 작성하세요

다음 JSON 형식으로 응답해주세요:
{
  "reply": "답변 내용"
}

반드시 유효한 JSON만 응답하세요.',
NOW()
FROM companies
ON CONFLICT (company_id, prompt_type) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template,
  updated_at = NOW();
