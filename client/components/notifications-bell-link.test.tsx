import { render, screen } from "@testing-library/react";
import { NotificationsBellLink } from "@/components/notifications-bell-link";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

describe("NotificationsBellLink", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
    sessionStorage.clear();
  });

  it("shows 'Open notifications' aria-label when not on notifications page", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link", { name: "Open notifications" })).toBeVisible();
  });

  it("links to /notifications with from param when not on notifications page", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/notifications?from=%2Fdashboard",
    );
  });

  it("saves the current path to sessionStorage when not on notifications page", () => {
    pathnameMock.mockReturnValue("/connections");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(sessionStorage.getItem("last-non-notifications-path")).toBe("/connections");
  });

  it("shows 'Return from notifications' aria-label when on notifications page", () => {
    pathnameMock.mockReturnValue("/notifications");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link", { name: "Return from notifications" })).toBeVisible();
  });

  it("links back to saved path when on notifications page", () => {
    sessionStorage.setItem("last-non-notifications-path", "/groups");
    pathnameMock.mockReturnValue("/notifications");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/groups");
  });

  it("falls back to /dashboard when no saved path exists and on notifications page", () => {
    pathnameMock.mockReturnValue("/notifications");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  });

  it("shows unread badge when unreadCount is greater than zero", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<NotificationsBellLink unreadCount={3} />);

    // Badge is a decorative span with a specific background class
    const badge = document.querySelector(".bg-\\[\\#2a74ff\\]");
    expect(badge).toBeInTheDocument();
  });

  it("hides unread badge when unreadCount is zero", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<NotificationsBellLink unreadCount={0} />);

    const badge = document.querySelector(".bg-\\[\\#2a74ff\\]");
    expect(badge).not.toBeInTheDocument();
  });

  it("applies active styles when on notifications page", () => {
    pathnameMock.mockReturnValue("/notifications");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link")).toHaveClass("border-accent/35");
  });

  it("applies inactive styles when not on notifications page", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link")).toHaveClass("border-border");
  });

  it("recognises sub-paths of /notifications as the notifications page", () => {
    pathnameMock.mockReturnValue("/notifications/123");

    render(<NotificationsBellLink unreadCount={0} />);

    expect(screen.getByRole("link", { name: "Return from notifications" })).toBeVisible();
  });
});
