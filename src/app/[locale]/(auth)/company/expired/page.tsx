"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, LogOut } from "lucide-react";

export default function ServiceExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">서비스가 만료되었습니다</CardTitle>
          <CardDescription>
            이용 기간이 종료되어 서비스에 접근할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 text-sm space-y-2">
            <p>서비스를 계속 이용하시려면 구독을 갱신해주세요.</p>
            <p className="text-muted-foreground">
              문의: support@listen.co.kr
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/company/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
