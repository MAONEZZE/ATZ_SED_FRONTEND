import type { MetadataJson } from "libphonenumber-js";
import metadata from "./metadata.json";

/**
 * Metadata enxuta do libphonenumber-js — apenas BR + países principais
 * (gerada filtrando metadata.min.json). Reduz o bundle do telefone de
 * ~82kB para ~14kB. Para suportar mais países, regenere metadata.json.
 *
 * O JSON é tipado estruturalmente como string[]; o cast alinha ao tipo
 * CountryCode[] esperado pela lib (os valores já são códigos válidos).
 */
export const phoneMetadata = metadata as unknown as MetadataJson;
