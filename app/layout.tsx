import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

// Fonte principal do site. Host Grotesk (secundária) não está no bundle de
// fontes do next/font desta versão do Next — carregada via <link> abaixo.
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-eb-garamond",
});

export const metadata: Metadata = {
  title: {
    default: "SED — Save Event Date",
    template: "%s | SED",
  },
  description:
    "SED — plataforma de gestão de eventos curados: landing pages, inscrições, mensagens e automações.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className={`${ebGaramond.variable} font-serif`}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
