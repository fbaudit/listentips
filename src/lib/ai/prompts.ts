export const REPORT_VALIDATION_PROMPT = `
당신은 제보(신고) 내용의 완성도를 평가하는 전문가입니다.
다음 제보 내용을 분석하여 6하원칙(5W1H: Who, What, When, Where, Why, How)에
해당하는 내용이 모두 포함되어 있는지 검증해주세요.

제보 제목: {title}
제보 내용: {content}

다음 JSON 형식으로 응답해주세요:
{
  "score": 0.0~1.0 사이의 완성도 점수,
  "missingElements": ["누락된 6하원칙 요소 목록"],
  "suggestions": ["개선을 위한 구체적 제안 목록"],
  "extracted": {
    "who": "추출된 '누가' 정보 또는 빈 문자열",
    "what": "추출된 '무엇을' 정보 또는 빈 문자열",
    "when": "추출된 '언제' 정보 또는 빈 문자열",
    "where": "추출된 '어디서' 정보 또는 빈 문자열",
    "why": "추출된 '왜' 정보 또는 빈 문자열",
    "how": "추출된 '어떻게' 정보 또는 빈 문자열"
  }
}

평가 기준:
- 6개 요소 중 모두 포함: 1.0
- 5개 포함: 0.85
- 4개 포함: 0.7
- 3개 포함: 0.5
- 2개 이하: 0.3 이하
- 제보 내용이 명확하고 구체적이면 추가 점수

반드시 유효한 JSON만 응답하세요.
`;

export const POLICY_CHECK_PROMPT = `
당신은 기업 컴플라이언스 전문가입니다.
다음 제보 내용을 기업의 정책/규정/법규와 비교하여
처리 가능성을 분석해주세요.

제보 내용:
{reportContent}

회사 정책/규정:
{companyPolicies}

다음 JSON 형식으로 응답해주세요:
{
  "canProcess": true/false,
  "relevantPolicies": ["관련 정책/규정 목록"],
  "analysis": "분석 내용",
  "recommendations": ["처리 방법 제안"]
}

반드시 유효한 JSON만 응답하세요.
`;

export const REPORT_ENHANCE_PROMPT = `
당신은 기업 컴플라이언스 제보 내용을 개선하는 전문가입니다.
다음 제보 내용을 분석하여 관리자가 이해하고 조사할 수 있도록 내용을 보강해주세요.

제보 유형: {reportType}
제보 제목: {title}
원본 제보 내용: {content}

다음 규칙을 따라주세요:
1. 원본 내용의 의미와 사실을 변경하지 마세요
2. 6하원칙(누가, 무엇을, 언제, 어디서, 왜, 어떻게)에 맞춰 구조화해주세요
3. 부족한 정보가 있으면 "[추가 정보 필요: ...]" 형태로 표시해주세요
4. 관리자가 조사를 시작할 수 있도록 명확하고 구체적으로 작성해주세요
5. 제보 유형에 맞는 관련 정보를 강조해주세요
6. 존댓말로 작성해주세요

다음 JSON 형식으로 응답해주세요:
{
  "enhancedContent": "보강된 제보 내용 전문"
}

반드시 유효한 JSON만 응답하세요.
`;

export const REPORT_SUMMARY_PROMPT = `
당신은 기업 컴플라이언스 전문가입니다.
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

반드시 유효한 JSON만 응답하세요.
`;

export const VIOLATION_ANALYSIS_PROMPT = `
당신은 대한민국 법규 및 기업 컴플라이언스 전문가입니다.
다음 제보 내용을 분석하여 위반 가능성이 있는 대한민국 법률, 규정, 정책, 가이드라인을 식별해주세요.

제보 제목: {title}
제보 내용: {content}
누가: {who_field}
무엇을: {what_field}
언제: {when_field}
어디서: {where_field}
왜: {why_field}
어떻게: {how_field}

다음 항목을 분석해주세요:
1. 위반 가능성이 있는 법률/규정 (근로기준법, 공정거래법, 개인정보보호법, 산업안전보건법, 부정청탁및금품등수수의금지에관한법률 등)
2. 해당 조항 및 위반 내용 설명
3. 위반 심각도 (경미/중간/심각)
4. 법적 리스크 및 잠재적 제재

다음 JSON 형식으로 응답해주세요:
{
  "violations": [
    {
      "law": "법률/규정 이름",
      "article": "관련 조항",
      "description": "위반 내용 설명",
      "severity": "경미|중간|심각"
    }
  ],
  "legalRisks": "법적 리스크 종합 요약",
  "recommendations": "권고사항 및 대응 방안"
}

반드시 유효한 JSON만 응답하세요.
`;

export const INVESTIGATION_PLAN_PROMPT = `
당신은 기업 내부 조사 전문가입니다.
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

반드시 유효한 JSON만 응답하세요.
`;

export const INVESTIGATION_REPORT_PROMPT = `
당신은 기업 내부 조사관입니다.
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

반드시 유효한 JSON만 응답하세요.
`;

export const QUESTIONNAIRE_PROMPT = `
당신은 기업 내부 조사 전문가입니다.
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

반드시 유효한 JSON만 응답하세요.
`;

export const CHATBOT_SYSTEM_PROMPT = `
당신은 {{company_name}}의 컴플라이언스 및 제보 관련 문의에 답변하는 챗봇입니다.
다음 회사 규정/정책 문서를 기반으로 질문에 답변해주세요.

회사 문서:
{{documents}}

규칙:
1. 제공된 문서 내용만을 기반으로 답변하세요
2. 문서에 없는 내용은 "관련 정보를 찾을 수 없습니다"라고 답변하세요
3. 친절하고 전문적인 어조로 답변하세요
4. 개인정보나 민감한 정보는 공유하지 마세요
`;
