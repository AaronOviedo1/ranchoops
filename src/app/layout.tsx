import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Zilla_Slab } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Cuerpo y datos: legible en tablas densas y bajo el sol.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Títulos: slab serif, con peso de placa de hierro marcado.
const zillaSlab = Zilla_Slab({
  variable: "--font-zilla",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Solo para identificadores (SINIIGA).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RanchOps",
  description: "Administración de ranchos ganaderos",
  applicationName: "RanchOps",
  appleWebApp: { capable: true, title: "RanchOps", statusBarStyle: "default" },
};

// La app se usa en el celular, en el rancho: que el navegador pinte del color correcto.
export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${zillaSlab.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
