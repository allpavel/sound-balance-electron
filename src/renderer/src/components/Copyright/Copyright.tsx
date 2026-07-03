import { Text } from "@mantine/core";

export default function Copyright() {
	const currentYear = new Date().getFullYear();

	return <Text>&copy; {currentYear} Pavel Alloyarov. All rights reserved</Text>;
}
