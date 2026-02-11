"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { Eye } from "lucide-react";

interface Application {
  id: string;
  company_name: string;
  admin_name: string;
  admin_email: string;
  status: string;
  created_at: string;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          setApplications(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">대기</Badge>;
      case "approved": return <Badge variant="default" className="bg-green-500">승인</Badge>;
      case "rejected": return <Badge variant="destructive">거절</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">서비스 신청 관리</h1>
        <p className="text-muted-foreground">서비스 신청을 검토하고 승인/거절합니다</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기업명</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">로딩 중...</TableCell></TableRow>
              ) : applications.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">신청이 없습니다</TableCell></TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.company_name}</TableCell>
                    <TableCell>{app.admin_name}</TableCell>
                    <TableCell>{app.admin_email}</TableCell>
                    <TableCell>{statusBadge(app.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString("ko")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        상세
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
