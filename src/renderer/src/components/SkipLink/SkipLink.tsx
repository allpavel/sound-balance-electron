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

import type { JSX, ReactNode } from "react";

export type SkipLinkProps = {
	/** Id of the landmark to jump to; must match `AppShell.Main`'s id. */
	targetId?: string;
	children?: ReactNode;
};

/**
 * Renders the skip navigation anchor.
 *
 * @param props - Optional target id and label override.
 * @returns A plain `<a href="#…">` — natively keyboard operable, no JS.
 */
export default function SkipLink({
	targetId = "main-content",
	children = "Skip to main content",
}: SkipLinkProps): JSX.Element {
	return (
		<a className="skip-link" href={`#${targetId}`}>
			{children}
		</a>
	);
}
