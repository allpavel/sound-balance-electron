/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
	Accordion,
	Button,
	Group,
	List,
	Modal,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { palette, statusTokens } from "@renderer/theme/tokens";
import { CircleCheck, CircleX, FolderOpen, ListChecks } from "lucide-react";
import { type JSX, useEffect } from "react";
import { toast } from "sonner";

/**
 * Processing results dialog + its toolbar trigger.
 *
 * @returns Results trigger + modal.
 */
export default function ResultModal(): JSX.Element {
	const [opened, { open, close }] = useDisclosure();
	const results = useAppSelector((state) => state.results);
	const outputDirectoryPath = useAppSelector(
		(state) => state.settings.data.global.outputDirectoryPath,
	);

	useEffect(() => {
		if (results.total > 0) {
			open();
		}
	}, [results, open]);

	const handleOpenOutputFolder = async () => {
		if (outputDirectoryPath) {
			try {
				const { success, reason } =
					await window.api.openOutputFolder(outputDirectoryPath);
				if (!success) {
					toast.error(reason);
				}
			} catch {
				toast.error("Failed to open the output directory.");
			}
		} else {
			toast.error("Output directory doesn't set.");
		}
	};

	const hasOutputFolder = outputDirectoryPath.trim().length > 0;

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				title="Processing results"
				className="allow-text-select"
			>
				<Stack gap="md">
					<Group gap="sm" wrap="wrap">
						<Text
							fw={600}
							fz="sm"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								padding: "4px 12px",
								borderRadius: 999,
								border: `1px solid ${palette.borderDecorative}`,
								backgroundColor: palette.surfaceSunken,
							}}
						>
							<ListChecks size={15} aria-hidden="true" />
							Total: {results.total}
						</Text>
						<Text
							fw={600}
							fz="sm"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								padding: "4px 12px",
								borderRadius: 999,
								color: statusTokens.completed.fg,
								backgroundColor: statusTokens.completed.bg,
								border: `1px solid ${statusTokens.completed.border}`,
							}}
						>
							<CircleCheck size={15} aria-hidden="true" />
							Processed: {results.successful}
						</Text>
						<Text
							fw={600}
							fz="sm"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								padding: "4px 12px",
								borderRadius: 999,
								color: statusTokens.failed.fg,
								backgroundColor: statusTokens.failed.bg,
								border: `1px solid ${statusTokens.failed.border}`,
							}}
						>
							<CircleX size={15} aria-hidden="true" />
							Failed: {results.failed.length}
						</Text>
					</Group>

					{results.failed.length > 0 && (
						<Accordion chevronIconSize={20} transitionDuration={300}>
							<Accordion.Item value="failed-files">
								<Accordion.Control>
									<Text fw={600} fz="sm">
										Failed files ({results.failed.length})
									</Text>
								</Accordion.Control>
								<Accordion.Panel>
									<List type="ordered" spacing="xs">
										{results.failed.map((item) => (
											<List.Item key={item.id}>
												<Stack gap={2}>
													<Text size="sm" fw={500}>
														{item.title}
													</Text>
													<Text
														size="xs"
														style={{ color: statusTokens.failed.fg }}
													>
														{item.reason}
													</Text>
												</Stack>
											</List.Item>
										))}
									</List>
								</Accordion.Panel>
							</Accordion.Item>
						</Accordion>
					)}

					{results.total > 0 && (
						<Tooltip
							disabled={hasOutputFolder}
							label="Choose an output folder in Settings first."
							withinPortal
						>
							<span style={{ display: "inline-block" }}>
								<Button
									onClick={handleOpenOutputFolder}
									disabled={!hasOutputFolder}
									leftSection={<FolderOpen size={16} aria-hidden="true" />}
									fullWidth
								>
									Open output folder
								</Button>
							</span>
						</Tooltip>
					)}
				</Stack>
			</Modal>
			<Button
				variant="light"
				onClick={open}
				leftSection={<ListChecks size={16} aria-hidden="true" />}
			>
				Results
			</Button>
		</>
	);
}
