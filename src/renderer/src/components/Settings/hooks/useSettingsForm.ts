import { useForm } from "@mantine/form";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useEffect } from "react";
import type { SettingsForm } from "../settings.types";

export default function useSettingsForm() {
	const settings = useAppSelector((state) => state.settings);
	const form = useForm<SettingsForm>({
		initialValues: {
			audio: { ...settings.audio },
			global: { ...settings.global },
		},
	});

	useEffect(() => {
		form.setValues({
			audio: { ...settings.audio },
			global: { ...settings.global },
		});
	}, [form.setValues, settings]);

	return { form, isLoading: settings.loading };
}
