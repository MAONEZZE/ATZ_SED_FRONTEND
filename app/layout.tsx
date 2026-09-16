import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

// Principal — corpo do site (aplicada em <body>).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Secundária — títulos (h1-h6, ver app/globals.css).
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: {
    default: "SED — Save Event Date",
    template: "%s | SED",
  },
  description:
    "SED — plataforma de gestão de eventos curados: landing pages, inscrições, mensagens e automações.",
  icons: {
    // Ícones quadrados com fundo ink: #8edd65 é "só sobre escuro" (globals.css),
    // e o Google renderiza o favicon sobre branco. O .ico existe na raiz porque
    // o Googlebot-favicon cai em /favicon.ico quando não aproveita o <link>.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${montserrat.variable} font-sans`}>
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
