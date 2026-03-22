import Dexie, { type EntityTable } from "dexie";
import type { GeneralSettings, Metadata } from "@/types";

const db = new Dexie("AudioDB") as Dexie & {
	tracks: EntityTable<Metadata, "id">;
	settings: EntityTable<{ id: string; settings: GeneralSettings }, "id">;
};

db.version(1).stores({
	tracks: "id, *collectionIds",
});

db.version(2).stores({
	tracks: "id, *collectionIds",
	settings: "id",
});

export { db };
