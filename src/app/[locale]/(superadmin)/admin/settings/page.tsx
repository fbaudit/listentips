"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Send, ShieldCheck, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface LoginSecuritySettings {
  max_attempts: number;
  lockout_minutes: number;
  captcha_enabled: boolean;
}

interface EmailSettings {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
  enabled: boolean;
}

interface SmsSettings {
  provider: string;
  api_key: string;
  sender_number: string;
  enabled: boolean;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [security, setSecurity] = useState<LoginSecuritySettings>({
    max_attempts: 5,
    lockout_minutes: 15,
    captcha_enabled: true,
  });

  const [email, setEmail] = useState<EmailSettings>({
    provider: "smtp",
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from_name: "모두의 제보채널",
    from_email: "",
    enabled: false,
  });

  const [sms, setSms] = useState<SmsSettings>({
    provider: "",
    api_key: "",
    sender_number: "",
    enabled: false,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          if (s.login_security) setSecurity(s.login_security);
          if (s.email_settings) setEmail(s.email_settings);
          if (s.sms_settings) setSms(s.sms_settings);
        }
      } catch {
        toast.error("설정을 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function saveSetting(key: string, value: unknown) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast.success("설정이 저장되었습니다");
      } else {
        toast.error("저장에 실패했습니다");
      }
    } catch {
      toast.error("서버에 연결할 수 없습니다");
    } finally {
      setSaving(null);
    }
  }

  async function testEmail() {
    setTesting("email");
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.from_email || email.user }),
      });
      if (res.ok) {
        toast.success("테스트 이메일을 발송했습니다");
      } else {
        const data = await res.json();
        toast.error(data.error || "테스트 발송에 실패했습니다");
      }
    } catch {
      toast.error("서버에 연결할 수 없습니다");
    } finally {
      setTesting(null);
    }
  }

  async function testSms() {
    setTesting("sms");
    try {
      const res = await fetch("/api/admin/settings/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sms.sender_number }),
      });
      if (res.ok) {
        toast.success("테스트 SMS를 발송했습니다");
      } else {
        const data = await res.json();
        toast.error(data.error || "테스트 발송에 실패했습니다");
      }
    } catch {
      toast.error("서버에 연결할 수 없습니다");
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">플랫폼 설정</h1>
        <p className="text-muted-foreground">보안, 이메일, SMS 등 플랫폼 전체 설정을 관리합니다</p>
      </div>

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            보안 설정
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            이메일 설정
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS 설정
          </TabsTrigger>
        </TabsList>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>로그인 보안 설정</CardTitle>
              <CardDescription>
                로그인 시도 제한과 CAPTCHA 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">최대 로그인 실패 횟수</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    min={1}
                    max={20}
                    value={security.max_attempts}
                    onChange={(e) =>
                      setSecurity({ ...security, max_attempts: parseInt(e.target.value) || 5 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    이 횟수를 초과하면 계정이 일시적으로 잠깁니다
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout_minutes">계정 잠금 시간 (분)</Label>
                  <Input
                    id="lockout_minutes"
                    type="number"
                    min={1}
                    max={1440}
                    value={security.lockout_minutes}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        lockout_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    잠금 후 다시 로그인할 수 있는 대기 시간
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>CAPTCHA 사용</Label>
                  <p className="text-xs text-muted-foreground">
                    Cloudflare Turnstile CAPTCHA를 로그인 페이지에 표시합니다
                  </p>
                </div>
                <Switch
                  checked={security.captcha_enabled}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, captcha_enabled: checked })
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveSetting("login_security", security)}
                  disabled={saving === "login_security"}
                >
                  {saving === "login_security" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>이메일 발송 설정</CardTitle>
              <CardDescription>
                알림 이메일을 발송하기 위한 SMTP 서버 설정입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>이메일 발송 사용</Label>
                  <p className="text-xs text-muted-foreground">
                    이메일 알림 기능을 활성화합니다
                  </p>
                </div>
                <Switch
                  checked={email.enabled}
                  onCheckedChange={(checked) =>
                    setEmail({ ...email, enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP 서버</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={email.host}
                    onChange={(e) => setEmail({ ...email, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">포트</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={email.port}
                    onChange={(e) =>
                      setEmail({ ...email, port: parseInt(e.target.value) || 587 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP 사용자</Label>
                  <Input
                    id="smtp_user"
                    placeholder="user@example.com"
                    value={email.user}
                    onChange={(e) => setEmail({ ...email, user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP 비밀번호</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    placeholder="••••••••"
                    value={email.password}
                    onChange={(e) =>
                      setEmail({ ...email, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>SSL/TLS 사용</Label>
                  <p className="text-xs text-muted-foreground">
                    보안 연결 사용 (포트 465일 경우 활성화)
                  </p>
                </div>
                <Switch
                  checked={email.secure}
                  onCheckedChange={(checked) =>
                    setEmail({ ...email, secure: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_name">발신자 이름</Label>
                  <Input
                    id="from_name"
                    placeholder="모두의 제보채널"
                    value={email.from_name}
                    onChange={(e) =>
                      setEmail({ ...email, from_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_email">발신자 이메일</Label>
                  <Input
                    id="from_email"
                    type="email"
                    placeholder="noreply@example.com"
                    value={email.from_email}
                    onChange={(e) =>
                      setEmail({ ...email, from_email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={testEmail}
                  disabled={testing === "email" || !email.host || !email.user}
                >
                  {testing === "email" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  테스트 발송
                </Button>
                <Button
                  onClick={() => saveSetting("email_settings", email)}
                  disabled={saving === "email_settings"}
                >
                  {saving === "email_settings" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS 발송 설정</CardTitle>
              <CardDescription>
                알림 SMS를 발송하기 위한 서비스 설정입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>SMS 발송 사용</Label>
                  <p className="text-xs text-muted-foreground">
                    SMS 알림 기능을 활성화합니다
                  </p>
                </div>
                <Switch
                  checked={sms.enabled}
                  onCheckedChange={(checked) =>
                    setSms({ ...sms, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms_provider">SMS 제공업체</Label>
                  <select
                    id="sms_provider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={sms.provider}
                    onChange={(e) =>
                      setSms({ ...sms, provider: e.target.value })
                    }
                  >
                    <option value="">선택하세요</option>
                    <option value="gabia">가비아</option>
                    <option value="aligo">알리고</option>
                    <option value="naver_cloud">네이버 클라우드</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms_api_key">API Key</Label>
                    <Input
                      id="sms_api_key"
                      type="password"
                      placeholder={sms.provider === "gabia" ? "SMS_ID:API_KEY" : sms.provider === "twilio" ? "ACCOUNT_SID:AUTH_TOKEN" : "API 키를 입력하세요"}
                      value={sms.api_key}
                      onChange={(e) =>
                        setSms({ ...sms, api_key: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_number">발신번호</Label>
                    <Input
                      id="sender_number"
                      placeholder="01012345678"
                      value={sms.sender_number}
                      onChange={(e) =>
                        setSms({ ...sms, sender_number: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={testSms}
                  disabled={
                    testing === "sms" || !sms.provider || !sms.api_key
                  }
                >
                  {testing === "sms" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  테스트 발송
                </Button>
                <Button
                  onClick={() => saveSetting("sms_settings", sms)}
                  disabled={saving === "sms_settings"}
                >
                  {saving === "sms_settings" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
