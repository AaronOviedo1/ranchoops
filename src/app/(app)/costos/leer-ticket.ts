"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIAS_GASTO } from "@/lib/catalogos";
import { fechaHoy } from "@/lib/fechas";

// "Va al Home Depot, le toma foto al ticket y se le sube todo: el concepto,
// el precio, si tiene IVA, tuvo descuento." Lo que sale de aquí NO se guarda
// solo: llena el formulario y la persona confirma.

const Ticket = z.object({
  concepto: z.string().describe("Qué se compró, en pocas palabras y en español"),
  proveedor: z.string().nullable().describe("Nombre del comercio o proveedor"),
  fecha: z.string().nullable().describe("Fecha del ticket en formato YYYY-MM-DD"),
  total: z.number().nullable().describe("Total pagado, con IVA incluido"),
  iva: z.number().nullable().describe("IVA desglosado, si viene"),
  descuento: z.number().nullable().describe("Descuento aplicado, si viene"),
  categoria: z
    .enum(CATEGORIAS_GASTO)
    .nullable()
    .describe("La categoría del catálogo que mejor le queda"),
  detalle: z.string().nullable().describe("Renglones del ticket, uno por línea"),
});

export type TicketLeido = z.infer<typeof Ticket>;

export type ResultadoTicket =
  | { ok: true; datos: TicketLeido }
  | { ok: false; error: string };

/** Está disponible la lectura de tickets en esta instalación. */
export async function hayLectorDeTickets(): Promise<boolean> {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export async function leerTicket(formData: FormData): Promise<ResultadoTicket> {
  await requireAdmin();

  if (!(await hayLectorDeTickets())) {
    return {
      ok: false,
      error:
        "Falta configurar AI_GATEWAY_API_KEY para leer tickets. Mientras tanto, captura el gasto a mano.",
    };
  }

  const archivo = formData.get("comprobante");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Adjunta primero la foto del ticket." };
  }
  if (archivo.size > 10 * 1024 * 1024) {
    return { ok: false, error: "La imagen pesa más de 10 MB; tómala de nuevo más chica." };
  }

  const datos = Buffer.from(await archivo.arrayBuffer());

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: Ticket }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Lee este ticket o factura de un rancho ganadero en México y saca los datos.",
                `Hoy es ${fechaHoy()}.`,
                "Los montos van en pesos mexicanos, sin símbolo ni comas.",
                "Si un dato no aparece en el ticket, déjalo en null; no lo inventes.",
              ].join(" "),
            },
            { type: "file", mediaType: archivo.type || "image/jpeg", data: datos },
          ],
        },
      ],
    });

    return { ok: true, datos: output };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `No se pudo leer el ticket: ${error.message}`
          : "No se pudo leer el ticket.",
    };
  }
}
