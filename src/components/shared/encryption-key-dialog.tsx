"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("encryption");
  const tc = useTranslations("common");

  useEffect(() => {
    if (open) {
      setKey("");
      setError(null);
    }
  }, [open]);

  const handleVerify = async () => {
    if (!key.trim()) {
      setError(t("pleaseEnterKey"));
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
        toast.success(t("keyVerified"));
      } else {
        setError(t("invalidKey"));
      }
    } catch {
      setError(t("serverError"));
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
            {t("enterKey")}
          </DialogTitle>
          <DialogDescription>
            {t("enterKeyDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enc_key">{t("encryptionKey")}</Label>
            <Input
              id="enc_key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t("keyPlaceholder")}
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
            {t("later")}
          </Button>
          <Button onClick={handleVerify} disabled={verifying || !key.trim()}>
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {tc("confirm")}
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
  const t = useTranslations("encryption");
  const tc = useTranslations("common");

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
        setError(data.error || t("generationFailed"));
      }
    } catch {
      setError(t("serverError"));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success(t("keyCopied"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {generatedKey ? t("generateComplete") : t("generateTitle")}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? t("keepKeySafe")
              : t("generateDescription")}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                <AlertTriangle className="w-4 h-4" />
                {t("saveKey")}
              </div>
              <p className="text-xs text-amber-700">
                {t("keyWarning")}
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
              <p className="font-medium">{t("notes")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t("note1")}</li>
                <li>{t("note2")}</li>
                <li>{t("note3")}</li>
                <li>{t("note4")}</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedKey ? (
            <Button onClick={() => onOpenChange(false)}>
              {t("confirmSaved")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("generateButton")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
