import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

function MockMotionSpan({
  children,
  transition: _transition,
  layoutId: _layoutId,
  ...props
}: Readonly<Record<string, unknown> & { children?: ReactNode }>) {
  return <span {...props}>{children}</span>;
}

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

vi.mock("motion/react", () => ({
  motion: {
    span: MockMotionSpan,
  },
}));

describe("MobileBottomNav", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
  });

  it("renders direct navigation links including settings without a menu button", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<MobileBottomNav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("link", { name: "People" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Groups" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("marks nested group pages as active", () => {
    pathnameMock.mockReturnValue("/groups/sample-group");

    render(<MobileBottomNav />);

    expect(screen.getByRole("link", { name: "Groups" })).toHaveClass("text-accent-strong");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("text-accent-strong");
  });
});