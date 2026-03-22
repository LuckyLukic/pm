import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

describe("Home auth flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows error for invalid credentials, signs in with valid credentials, and logs out", async () => {
    render(<Home />);

    await screen.findByRole("heading", { name: /sign in to kanban studio/i });

    await userEvent.type(screen.getByLabelText(/username/i), "wrong");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      screen.getByText(/invalid credentials\. use user \/ password\./i)
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /kanban studio/i })
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pm.authenticated")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /sign in to kanban studio/i })
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pm.authenticated")).toBeNull();
  });
});
