"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEFAULT_REPORT_TYPES = [
  { name: "횡령/부정", code: "EMBEZZLEMENT" },
  { name: "뇌물/부패", code: "BRIBERY" },
  { name: "이해충돌", code: "CONFLICT_OF_INTEREST" },
  { name: "직장내 괴롭힘", code: "WORKPLACE_BULLYING" },
  { name: "성희롱/성폭력", code: "SEXUAL_HARASSMENT" },
  { name: "차별", code: "DISCRIMINATION" },
  { name: "안전/보건 위반", code: "SAFETY_VIOLATION" },
  { name: "환경 위반", code: "ENVIRONMENTAL" },
  { name: "개인정보 침해", code: "PRIVACY_VIOLATION" },
  { name: "회계부정", code: "ACCOUNTING_FRAUD" },
  { name: "기타", code: "OTHER" },
];

const DEFAULT_STATUSES = [
  { name: "접수", code: "RECEIVED", color: "#6B7280", order: 1 },
  { name: "검토중", code: "REVIEWING", color: "#F59E0B", order: 2 },
  { name: "조사중", code: "INVESTIGATING", color: "#3B82F6", order: 3 },
  { name: "완료", code: "COMPLETED", color: "#10B981", order: 4 },
  { name: "종결", code: "CLOSED", color: "#6B7280", order: 5 },
];

export default function AdminCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">코드 관리</h1>
        <p className="text-muted-foreground">제보 유형 및 상태 코드를 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 제보 유형</CardTitle>
          <CardDescription>신규 기업 등록 시 자동으로 생성되는 기본 제보 유형입니다</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>유형명</TableHead>
                <TableHead>코드</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEFAULT_REPORT_TYPES.map((type) => (
                <TableRow key={type.code}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{type.code}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기본 상태 코드</CardTitle>
          <CardDescription>제보 처리 단계를 나타내는 상태 코드입니다</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태명</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>색상</TableHead>
                <TableHead>순서</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEFAULT_STATUSES.map((status) => (
                <TableRow key={status.code}>
                  <TableCell className="font-medium">{status.name}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{status.code}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: status.color }} />
                      <span className="text-sm font-mono">{status.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{status.order}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
