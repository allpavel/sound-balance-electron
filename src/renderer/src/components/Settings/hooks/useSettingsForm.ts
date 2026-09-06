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
import { looseSettingsSchema } from "@shared/schemas/settings.schema";
import { useEffect } from "react";

export default function useSettingsForm() {
	const { data: settings, loading } = useAppSelector((state) => state.settings);
	const form = useSettingsFormInstance({
		initialValues: {
			version: settings.version,
			audio: structuredClone(settings.audio),
			global: structuredClone(settings.global),
		},
		validate: schemaResolver(looseSettingsSchema),
	});

	useEffect(() => {
		form.setValues({
			version: settings.version,
			audio: structuredClone(settings.audio),
			global: structuredClone(settings.global),
		});
	}, [form.setValues, settings]);

	return { form, isLoading: loading };
}
