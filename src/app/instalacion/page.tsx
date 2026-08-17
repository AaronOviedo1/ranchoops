import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Instalación — RanchOps" };

export default function InstalacionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>🐄 RanchOps — falta configurar Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Para que la app funcione necesitas:</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>
              Crear un proyecto gratuito en{" "}
              <a href="https://supabase.com" className="underline">
                supabase.com
              </a>
              .
            </li>
            <li>
              Ejecutar la migración: en el SQL Editor de Supabase pega el
              contenido de{" "}
              <code className="rounded bg-muted px-1">
                supabase/migrations/0001_esquema_inicial.sql
              </code>{" "}
              (o corre <code className="rounded bg-muted px-1">supabase db push</code>).
            </li>
            <li>
              Copiar <code className="rounded bg-muted px-1">.env.example</code> a{" "}
              <code className="rounded bg-muted px-1">.env.local</code> y llenar{" "}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              (Settings → API). En Vercel, agrégalas en Environment Variables.
            </li>
            <li>Reiniciar el servidor.</li>
          </ol>
          <p className="text-muted-foreground">
            El mapa además necesita{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            (gratis en account.mapbox.com).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
