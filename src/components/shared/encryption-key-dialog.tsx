"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Lock, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EncryptionKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyVerified: (key: string) => void;
}

export function EncryptionKeyDialog({ open, onOpenChange, onKeyVerified }: EncryptionKeyDialogProps) {
  const [key, setKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKey("");
      setError(null);
    }
  }, [open]);

  const handleVerify = async () => {
    if (!key.trim()) {
      setError("암호화 키를 입력해주세요");
      return;
    }
    setError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/company/encryption-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", key: key.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        sessionStorage.setItem("encryptionKey", key.trim());
        onKeyVerified(key.trim());
        onOpenChange(false);
        toast.success("암호화 키가 확인되었습니다");
      } else {
        setError("암호화 키가 올바르지 않습니다");
      }
    } catch {
      setError("서버에 연결할 수 없습니다");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            암호화 키 입력
          </DialogTitle>
          <DialogDescription>
            제보 데이터를 열람하려면 암호화 키를 입력해야 합니다.
            키가 없으면 제보 제목과 내용이 &quot;[암호화됨]&quot;으로 표시됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enc_key">암호화 키</Label>
            <Input
              id="enc_key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="암호화 키를 입력하세요"
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify();
              }}
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            나중에
          </Button>
          <Button onClick={handleVerify} disabled={verifying || !key.trim()}>
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EncryptionKeyGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}

export function EncryptionKeyGenerateDialog({ open, onOpenChange, onGenerated }: EncryptionKeyGenerateDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setGeneratedKey(null);
      setError(null);
    }
  }, [open]);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/company/encryption-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });

      const data = await res.json();
      if (res.ok && data.dataKey) {
        setGeneratedKey(data.dataKey);
        onGenerated();
      } else {
        setError(data.error || "키 생성에 실패했습니다");
      }
    } catch {
      setError("서버에 연결할 수 없습니다");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("키가 클립보드에 복사되었습니다");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {generatedKey ? "암호화 키 생성 완료" : "데이터 암호화 키 생성"}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? "아래 키를 안전한 곳에 보관하세요. 이 키는 다시 표시되지 않습니다."
              : "제보 데이터를 암호화하기 위한 고유 키를 생성합니다. 이 키는 한 번만 표시되며, 분실 시 복구가 불가능합니다."}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                <AlertTriangle className="w-4 h-4" />
                이 키를 안전하게 보관하세요
              </div>
              <p className="text-xs text-amber-700">
                이 키는 이 화면을 닫으면 다시 확인할 수 없습니다. 분실 시 암호화된 데이터를 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generatedKey}
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="rounded-md bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">키 생성 시 유의사항:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>키는 생성 후 한 번만 표시됩니다</li>
                <li>키를 분실하면 암호화된 데이터 복구가 불가능합니다</li>
                <li>키를 안전한 곳에 별도로 보관해야 합니다</li>
                <li>이후 제보 조회 시 키를 입력해야 내용을 확인할 수 있습니다</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedKey ? (
            <Button onClick={() => onOpenChange(false)}>
              확인 (키를 보관했습니다)
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                키 생성
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
