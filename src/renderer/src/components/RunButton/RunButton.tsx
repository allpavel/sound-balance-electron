import { Button } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStop } from "@tabler/icons-react";

type RunButtonProps = {
	isRunning: boolean;
	handleButtonClick: () => void;
};

export default function RunButton({
	isRunning,
	handleButtonClick,
}: RunButtonProps) {
	if (isRunning) {
		return (
			<Button
				leftSection={<IconPlayerStop size={14} />}
				onClick={handleButtonClick}
			>
				Stop
			</Button>
		);
	}
	return (
		<Button
			leftSection={<IconPlayerPlayFilled size={14} />}
			onClick={handleButtonClick}
		>
			Run
		</Button>
	);
}
