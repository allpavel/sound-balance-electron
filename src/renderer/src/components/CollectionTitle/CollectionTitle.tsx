import { Flex, Title } from "@mantine/core";
import { useAppSelector } from "@renderer/hooks/useAppSelector";

export function CollectionTitle() {
	const collection = useAppSelector((state) => state.activeCollection);

	return (
		<Flex mb={"sm"}>
			<Title order={1}>{collection.title}</Title>
		</Flex>
	);
}
