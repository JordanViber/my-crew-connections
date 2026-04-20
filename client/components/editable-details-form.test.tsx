import { fireEvent, render, screen } from "@testing-library/react";
import { EditableDetailsForm } from "@/components/editable-details-form";

describe("EditableDetailsForm", () => {
  it("starts in read-only mode and enables inputs after clicking edit", () => {
    render(
      <EditableDetailsForm
        action={async () => {}}
        editLabel="Edit connection"
        saveLabel="Save connection"
      >
        <label>
          <span>Name</span>
          <input defaultValue="Jordan" name="displayName" />
        </label>
      </EditableDetailsForm>,
    );

    const input = screen.getByRole("textbox", { name: /name/i });
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit connection" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));

    expect(input).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Save connection" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("resets the form and returns to read-only mode on cancel", () => {
    render(
      <EditableDetailsForm
        action={async () => {}}
        editLabel="Edit connection"
        saveLabel="Save connection"
      >
        <label>
          <span>Name</span>
          <input defaultValue="Jordan" name="displayName" />
        </label>
      </EditableDetailsForm>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    const input = screen.getByRole("textbox", { name: /name/i });
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(input).toHaveValue("Jordan");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit connection" })).toBeVisible();
  });
});
