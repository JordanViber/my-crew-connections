import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";

function MockMotionDiv({
  children,
  ...props
}: Readonly<Record<string, unknown> & { children?: ReactNode }>) {
  const divProps = { ...props };
  delete divProps.initial;
  delete divProps.animate;
  delete divProps.exit;
  delete divProps.transition;
  delete divProps.layoutId;

  return <div {...divProps}>{children}</div>;
}

function MockMotionSpan({
  children,
  ...props
}: Readonly<Record<string, unknown> & { children?: ReactNode }>) {
  const spanProps = { ...props };
  delete spanProps.transition;
  delete spanProps.layoutId;

  return <span {...spanProps}>{children}</span>;
}

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: MockMotionDiv,
    span: MockMotionSpan,
  },
}));

describe("MobileSectionTabs", () => {
  const sections = [
    { id: "focus", label: "Focus", content: <p>Focus content</p> },
    { id: "log", label: "Log", content: <p>Log content</p> },
    { id: "history", label: "History", content: <p>History content</p> },
  ];

  it("renders the requested initial section and switches content when a tab is pressed", () => {
    render(<MobileSectionTabs sections={sections} initialSectionId="log" />);

    expect(screen.getByText("Log content")).toBeVisible();
    expect(screen.queryByText("Focus content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    expect(screen.getByText("History content")).toBeVisible();
    expect(screen.queryByText("Log content")).not.toBeInTheDocument();
  });

  it("falls back to the first section and resets when the initial section changes", () => {
    const { rerender } = render(<MobileSectionTabs sections={sections} initialSectionId="missing" />);

    expect(screen.getByText("Focus content")).toBeVisible();

    rerender(<MobileSectionTabs sections={sections} initialSectionId="history" />);

    expect(screen.getByText("History content")).toBeVisible();
    expect(screen.queryByText("Focus content")).not.toBeInTheDocument();
  });
});
