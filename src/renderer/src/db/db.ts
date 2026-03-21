import Dexie, { type EntityTable } from "dexie";
import type { Metadata } from "@/types";

const db = new Dexie("AudioDB") as Dexie & {
	tracks: EntityTable<Metadata, "id">;
};

db.version(1).stores({
	tracks: "id, *collectionIds",
});

export { db };
