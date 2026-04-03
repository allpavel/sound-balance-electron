import {
	ActionIcon,
	Button,
	Flex,
	Modal,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/hooks/useCollections";
import { IconPlusFilled } from "@tabler/icons-react";
import type { CollectionType } from "@/types";

export default function AddCollection() {
	const [opened, { open, close }] = useDisclosure(false);
	const { addCollection } = useCollections();

	const initialValues: Omit<CollectionType, "id"> = {
		title: "",
	};

	const form = useForm({
		initialValues,
	});

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				title={"Add new collection"}
				centered
			>
				<form
					onSubmit={form.onSubmit((values) => {
						addCollection({ title: values.title });
						form.reset();
						close();
					})}
				>
					<TextInput
						label={"Title:"}
						required
						key={form.key("title")}
						{...form.getInputProps("title")}
					/>
					<Flex justify={"center"} mt={"md"}>
						<Button type="submit">Submit</Button>
					</Flex>
				</form>
			</Modal>
			<Tooltip label="Add collection">
				<ActionIcon
					variant="filled"
					aria-label="Add collection"
					onClick={open}
					my="sm"
				>
					<IconPlusFilled />
				</ActionIcon>
			</Tooltip>
		</>
	);
}
