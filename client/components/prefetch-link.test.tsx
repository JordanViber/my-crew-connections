import { render, screen, fireEvent } from "@testing-library/react";
import { PrefetchLink } from "@/components/prefetch-link";

const { prefetchMock } = vi.hoisted(() => ({
  prefetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: prefetchMock,
  }),
}));

describe("PrefetchLink", () => {
  beforeEach(() => {
    prefetchMock.mockReset();
  });

  it("renders children as a link with the given href", () => {
    render(<PrefetchLink href="/dashboard">Dashboard</PrefetchLink>);

    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("calls router.prefetch on mouse enter", () => {
    render(<PrefetchLink href="/connections">Connections</PrefetchLink>);

    fireEvent.mouseEnter(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/connections");
  });

  it("calls router.prefetch on focus", () => {
    render(<PrefetchLink href="/groups">Groups</PrefetchLink>);

    fireEvent.focus(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/groups");
  });

  it("calls router.prefetch on pointer down", () => {
    render(<PrefetchLink href="/hangouts">Hangouts</PrefetchLink>);

    fireEvent.pointerDown(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/hangouts");
  });

  it("calls router.prefetch on touch start", () => {
    render(<PrefetchLink href="/settings">Settings</PrefetchLink>);

    fireEvent.touchStart(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/settings");
  });

  it("calls router.prefetch with pathname when href is an object", () => {
    render(
      <PrefetchLink href={{ pathname: "/groups", query: { tab: "all" } }}>Groups</PrefetchLink>,
    );

    fireEvent.mouseEnter(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/groups");
  });

  it("falls back to / when href object has no pathname", () => {
    render(<PrefetchLink href={{ hash: "#section" }}>Section</PrefetchLink>);

    fireEvent.mouseEnter(screen.getByRole("link"));
    expect(prefetchMock).toHaveBeenCalledWith("/");
  });

  it("forwards className to the link element", () => {
    render(
      <PrefetchLink href="/dashboard" className="nav-link">
        Dashboard
      </PrefetchLink>,
    );

    expect(screen.getByRole("link")).toHaveClass("nav-link");
  });
});
