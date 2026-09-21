import "server-only";
import { revalidatePath } from "next/cache";

/**
 * El inventario vive en "Todo" y en una página por categoría: se refrescan
 * juntas. El patrón va con y sin el grupo `(app)` porque la ruta del archivo
 * lo lleva y la documentación acepta las dos formas.
 */
export function revalidarInventario() {
  revalidatePath("/inventario");
  revalidatePath("/inventario/[categoria]", "page");
  revalidatePath("/(app)/inventario/[categoria]", "page");
}
