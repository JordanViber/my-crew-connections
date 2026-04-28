import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("vaul", async () => {
  const React = await import("react");

  const DrawerContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
    open: false,
    setOpen: () => {},
  });

  function withClickHandler(child: React.ReactElement<{ onClick?: (event: unknown) => void }>, next: () => void) {
    return React.cloneElement(child, {
      onClick: (event) => {
        child.props.onClick?.(event);
        next();
      },
    });
  }

  function Root({ children }: Readonly<{ children: ReactNode }>) {
    const [open, setOpen] = React.useState(false);
    const value = React.useMemo(() => ({ open, setOpen }), [open]);

    return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
  }

  function Trigger({ children, asChild }: Readonly<{ children: ReactNode; asChild?: boolean }>) {
    const { setOpen } = React.useContext(DrawerContext);

    if (asChild && React.isValidElement(children)) {
      return withClickHandler(children, () => setOpen(true));
    }

    return <button onClick={() => setOpen(true)}>{children}</button>;
  }

  function Close({ children, asChild }: Readonly<{ children: ReactNode; asChild?: boolean }>) {
    const { setOpen } = React.useContext(DrawerContext);

    if (asChild && React.isValidElement(children)) {
      return withClickHandler(children, () => setOpen(false));
    }

    return <button onClick={() => setOpen(false)}>{children}</button>;
  }

  function Overlay(props: Record<string, unknown>) {
    const { open } = React.useContext(DrawerContext);

    return open ? <div {...props} /> : null;
  }

  function Content({ children, ...props }: Readonly<{ children: ReactNode }>) {
    const { open } = React.useContext(DrawerContext);

    return open ? <div {...props}>{children}</div> : null;
  }

  function Title({ children, ...props }: Readonly<{ children: ReactNode }>) {
    return <h2 {...props}>{children}</h2>;
  }

  function Description({ children, ...props }: Readonly<{ children: ReactNode }>) {
    return <p {...props}>{children}</p>;
  }

  return {
    Drawer: {
      Root,
      Trigger,
      Portal: ({ children }: Readonly<{ children: ReactNode }>) => <>{children}</>,
      Overlay,
      Content,
      Title,
      Description,
      Close,
    },
  };
});

describe("MobileBottomNav", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
  });

  it("opens the drawer with page-specific copy and the signed-in email", () => {
    pathnameMock.mockReturnValue("/dashboard");

    render(<MobileBottomNav title="Dashboard Overview" email="hello@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("heading", { name: "Move around faster" })).toBeVisible();
    expect(screen.getByText("Quick navigation for dashboard overview.")).toBeVisible();
    expect(screen.getByText("hello@example.com")).toBeVisible();
    expect(screen.getByLabelText("Quick navigation menu")).toBeVisible();
  });

  it("marks nested group pages as active", () => {
    pathnameMock.mockReturnValue("/groups/sample-group");

    render(<MobileBottomNav title="Groups" email="hello@example.com" />);

    expect(screen.getByRole("link", { name: "Groups" })).toHaveClass("text-accent-strong");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("text-accent-strong");
  });
});