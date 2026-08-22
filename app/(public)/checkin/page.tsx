"use client";

import { useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input/core";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitPublicCheckin } from "@/lib/api/public";
import { PhoneField } from "@/components/forms/phone-field";
import { phoneMetadata } from "@/lib/phone/metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { isSubmitted, markSubmitted } from "@/lib/utils/local-draft";

const SUBMITTED_FLAG = "checkin_submitted";

export default function CheckinPage() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() => isSubmitted(SUBMITTED_FLAG));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhoneNumber(phone, phoneMetadata)) {
      toast.error("Informe um telefone válido");
      return;
    }

    setSubmitting(true);
    try {
      await submitPublicCheckin(phone);
      markSubmitted(SUBMITTED_FLAG);
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao fazer check-in");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-12 w-12 text-accent-ink" />
            <CardTitle>Check-in confirmado</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check-in</CardTitle>
          <CardDescription className="text-base">
            Preencha com o mesmo telefone da inscrição para fazer o check-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="checkin-phone">Telefone</Label>
              <PhoneField
                id="checkin-phone"
                value={phone}
                onChange={setPhone}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={submitting || !phone}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Checkin
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
