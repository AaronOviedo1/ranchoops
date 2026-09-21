"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Las maneras de mirar un animal: cómo va (producción), por dónde ha pasado
 * (historial) y qué papeles tiene (documentos). Antes iban una debajo de otra
 * y la línea de tiempo empujaba los números fuera de la pantalla.
 */
export function PanelAnimal({
  produccion,
  historial,
  documentos,
  numDocumentos = 0,
  acciones,
}: {
  produccion: ReactNode;
  historial: ReactNode;
  documentos?: ReactNode;
  /** Va en la pestaña: si no se ve el número, nadie la abre. */
  numDocumentos?: number;
  acciones?: ReactNode;
}) {
  return (
    <Tabs defaultValue="produccion">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-1">
        <TabsList variant="line">
          <TabsTrigger value="produccion">Producción</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          {documentos && (
            <TabsTrigger value="documentos">
              Documentos{numDocumentos > 0 ? ` · ${numDocumentos}` : ""}
            </TabsTrigger>
          )}
        </TabsList>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
      <TabsContent value="produccion" className="space-y-4 pt-4">
        {produccion}
      </TabsContent>
      <TabsContent value="historial" className="pt-4">
        {historial}
      </TabsContent>
      {documentos && (
        <TabsContent value="documentos" className="pt-4">
          {documentos}
        </TabsContent>
      )}
    </Tabs>
  );
}
