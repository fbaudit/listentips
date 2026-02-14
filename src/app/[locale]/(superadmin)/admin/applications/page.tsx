"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "@/i18n/routing";
import { Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

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

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/applications/${id}`, { method: "DELETE" }).then((res) => res.ok)
        )
      );
      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`${successCount}건의 신청이 삭제되었습니다`);
        setApplications((prev) => prev.filter((a) => !selectedIds.has(a.id)));
        setSelectedIds(new Set());
      }
      if (failCount > 0) {
        toast.error(`${failCount}건 삭제에 실패했습니다`);
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">서비스 신청 관리</h1>
          <p className="text-muted-foreground">서비스 신청을 검토하고 승인/거절합니다</p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {selectedIds.size}건 삭제
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={applications.length > 0 && selectedIds.size === applications.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8">로딩 중...</TableCell></TableRow>
              ) : applications.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">신청이 없습니다</TableCell></TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                      />
                    </TableCell>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}건의 신청을 삭제하시겠습니까?<br />
              삭제된 신청은 복구할 수 없습니다. 이미 승인된 신청을 삭제해도 생성된 기업 계정에는 영향이 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
