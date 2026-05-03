import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/navigation", async () => {
	const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");

	return {
		...actual,
		useRouter: () => ({
			prefetch: () => Promise.resolve(),
			push: () => {},
			replace: () => {},
			refresh: () => {},
			back: () => {},
			forward: () => {},
		}),
	};
});