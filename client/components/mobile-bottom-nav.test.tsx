import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const { pathnameMock, prefetchMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  prefetchMock: vi.fn(),
}));

function MockMotionSpan({
  children,
  ...props
}: Readonly<Record<string, unknown> & { children?: ReactNode }>) {
  const spanProps = { ...props };
  delete spanProps.transition;
  delete spanProps.layoutId;

  return <span {...spanProps}>{children}</span>;
}

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
  useRouter: () => ({
    prefetch: prefetchMock,
  }),
}));

vi.mock("motion/react", () => ({
  motion: {
    span: MockMotionSpan,
  },
}));

describe("MobileBottomNav", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
    prefetchMock.mockReset();
  });

  it("renders direct primary navigation links without a menu button", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<MobileBottomNav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("link", { name: "People" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Groups" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("marks nested group pages as active", () => {
    pathnameMock.mockReturnValue("/groups/sample-group");

    render(<MobileBottomNav />);

    expect(screen.getByRole("link", { name: "Groups" })).toHaveClass("text-accent-strong");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("text-accent-strong");
  });
});
