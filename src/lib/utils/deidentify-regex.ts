/**
 * Regex-based PII de-identification utility.
 * Detects structured personal information (phone numbers, emails, SSNs, etc.)
 * and replaces them with consistent placeholders.
 * Does NOT detect names or contextual PII — use AI mode for that.
 */

interface MappingEntry {
  original: string;
  placeholder: string;
  category: string;
}

interface DeidentifyResult {
  text: string;
  mappings: MappingEntry[];
}

// Counters for placeholder numbering
interface PlaceholderCounters {
  연락처: number;
  이메일: number;
  신분증번호: number;
  금융정보: number;
  기타: number;
}

// ── Regex patterns for Korean PII ──

const PATTERNS: Array<{
  regex: RegExp;
  category: keyof PlaceholderCounters;
  label: string;
}> = [
  // Korean resident registration number (주민등록번호): 123456-1234567
  {
    regex: /\d{6}\s?-\s?[1-4]\d{6}/g,
    category: "신분증번호",
    label: "신분증번호",
  },
  // Foreign registration number: same format
  {
    regex: /\d{6}\s?-\s?[5-8]\d{6}/g,
    category: "신분증번호",
    label: "신분증번호",
  },
  // Email addresses
  {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    category: "이메일",
    label: "이메일",
  },
  // Korean mobile phone: 010-1234-5678, 010.1234.5678, 01012345678
  {
    regex: /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    category: "연락처",
    label: "연락처",
  },
  // Korean landline: 02-1234-5678, 031-123-4567, etc.
  {
    regex: /0[2-6][0-9][-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    category: "연락처",
    label: "연락처",
  },
  // Credit card numbers: 1234-5678-9012-3456
  {
    regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
    category: "금융정보",
    label: "금융정보",
  },
  // Bank account numbers: common Korean formats (10-14 digits with dashes)
  {
    regex: /\d{3,6}[-]\d{2,6}[-]\d{2,8}/g,
    category: "금융정보",
    label: "금융정보",
  },
  // Passport number: M12345678 or similar
  {
    regex: /[A-Z][A-Z0-9]\d{7}/g,
    category: "신분증번호",
    label: "신분증번호",
  },
  // IP addresses
  {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    category: "기타",
    label: "기타",
  },
];

/**
 * Apply regex-based de-identification to a single text string.
 * Uses a shared mapping so the same original value gets the same placeholder.
 */
function deidentifyText(
  text: string,
  existingMap: Map<string, MappingEntry>,
  counters: PlaceholderCounters
): string {
  if (!text) return text;

  let result = text;

  for (const pattern of PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.regex.lastIndex = 0;
    const matches = text.match(pattern.regex);
    if (!matches) continue;

    // Deduplicate matches
    const unique = [...new Set(matches)];
    for (const match of unique) {
      if (existingMap.has(match)) {
        // Reuse existing placeholder
        const entry = existingMap.get(match)!;
        result = result.split(match).join(entry.placeholder);
      } else {
        counters[pattern.category]++;
        const placeholder = `[${pattern.label}${counters[pattern.category]}]`;
        const entry: MappingEntry = {
          original: match,
          placeholder,
          category: pattern.label,
        };
        existingMap.set(match, entry);
        result = result.split(match).join(placeholder);
      }
    }
  }

  return result;
}

/**
 * Run regex-based de-identification on report fields.
 * Returns the same structure as AI de-identification.
 */
export function regexDeidentify(input: {
  title: string;
  content: string;
  fields: {
    who_field: string;
    what_field: string;
    when_field: string;
    where_field: string;
    why_field: string;
    how_field: string;
  };
}): {
  deidentifiedTitle: string;
  deidentifiedContent: string;
  deidentifiedFields: {
    who_field: string;
    what_field: string;
    when_field: string;
    where_field: string;
    why_field: string;
    how_field: string;
  };
  mappingTable: MappingEntry[];
} {
  const existingMap = new Map<string, MappingEntry>();
  const counters: PlaceholderCounters = {
    연락처: 0,
    이메일: 0,
    신분증번호: 0,
    금융정보: 0,
    기타: 0,
  };

  // Process all fields with shared mapping
  const deidentifiedTitle = deidentifyText(input.title, existingMap, counters);
  const deidentifiedContent = deidentifyText(input.content, existingMap, counters);

  const deidentifiedFields = {
    who_field: deidentifyText(input.fields.who_field, existingMap, counters),
    what_field: deidentifyText(input.fields.what_field, existingMap, counters),
    when_field: deidentifyText(input.fields.when_field, existingMap, counters),
    where_field: deidentifyText(input.fields.where_field, existingMap, counters),
    why_field: deidentifyText(input.fields.why_field, existingMap, counters),
    how_field: deidentifyText(input.fields.how_field, existingMap, counters),
  };

  return {
    deidentifiedTitle,
    deidentifiedContent,
    deidentifiedFields,
    mappingTable: Array.from(existingMap.values()),
  };
}
