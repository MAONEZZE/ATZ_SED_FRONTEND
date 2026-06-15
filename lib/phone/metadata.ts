import type { MetadataJson } from "libphonenumber-js";
import metadata from "./metadata.json";

export const phoneMetadata = metadata as unknown as MetadataJson;
