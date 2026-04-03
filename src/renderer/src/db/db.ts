import Dexie, { type EntityTable } from "dexie";
import type { CollectionType, GeneralSettings, Metadata } from "@/types";

const db = new Dexie("AudioDB") as Dexie & {
	tracks: EntityTable<Metadata, "id">;
	settings: EntityTable<{ id: string; settings: GeneralSettings }, "id">;
	collections: EntityTable<CollectionType, "id">;
};

db.version(1).stores({
	tracks: "id, *collectionIds",
});

db.version(2).stores({
	tracks: "id, *collectionIds",
	settings: "id",
});

db.version(3).stores({
	tracks: "id, *collectionIds",
	settings: "id",
	collections: "++id",
});

db.version(4).stores({
	tracks: "id, *collectionIds, selected",
	settings: "id",
	collections: "++id",
});

db.version(5).stores({
	tracks: "id, *collectionIds, selected",
	settings: "id",
	collections: "id",
});

db.version(6).stores({
	tracks: "id, filePath, *collectionIds, selected",
	settings: "id",
	collections: "id",
});

db.on("populate", (tx) => {
	tx.table("collections").add({
		id: "all",
		title: "All",
	});
});

export { db };
