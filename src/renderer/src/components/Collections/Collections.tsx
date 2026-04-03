import { AppShell, NavLink, Text } from "@mantine/core";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useCollections } from "@renderer/hooks/useCollections";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import AddCollection from "../AddCollection/AddCollection";

export default function Collections() {
	const { collections } = useCollections();
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const dispatch = useAppDispatch();

	return (
		<AppShell.Navbar px={"sm"}>
			<Text size={"lg"}>Collections:</Text>
			{collections.map((collection) => (
				<NavLink
					href={`${collection.id}`}
					label={collection.title}
					key={collection.id}
					active={activeCollection.id === collection.id}
					onClick={(e) => {
						e.preventDefault();
						dispatch(setActiveCollection(collection));
					}}
				/>
			))}
			<AddCollection />
		</AppShell.Navbar>
	);
}
