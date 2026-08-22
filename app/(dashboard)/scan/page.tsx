"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";

const QR_SIZE = 280;

export default function ScanPage() {
  // A URL do QR precisa ser absoluta, então só existe no cliente.
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="space-y-6">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Escaneie o código para fazer o check-in
          </h1>

          {/* Fundo branco e módulos preto fixos: no dark mode um QR invertido não
              é lido pela câmera. Única exceção aos tokens de tema. */}
          <div className="flex items-center justify-center rounded-md bg-white p-4">
            {origin ? (
              <QRCodeSVG
                value={`${origin}/checkin`}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                size={QR_SIZE}
                className="h-auto w-full max-w-[280px]"
              />
            ) : (
              // reserva o espaço do QR para a página não pular quando ele monta
              <div className="h-[280px] w-full max-w-[280px]" aria-hidden />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
