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

import { schemaResolver } from "@mantine/form";
import { useSettingsFormInstance } from "@renderer/components/Settings/context/SettingsFormContext";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useEffect } from "react";
import { settingsSchema } from "../../../../../shared/schemas/settings.schema";

export default function useSettingsForm() {
	const settings = useAppSelector((state) => state.settings);
	const form = useSettingsFormInstance({
		initialValues: {
			audio: structuredClone(settings.audio),
			global: structuredClone(settings.global),
		},
		validate: schemaResolver(settingsSchema),
	});

	useEffect(() => {
		form.setValues({
			audio: structuredClone(settings.audio),
			global: structuredClone(settings.global),
		});
	}, [form.setValues, settings]);

	return { form, isLoading: settings.loading };
}
