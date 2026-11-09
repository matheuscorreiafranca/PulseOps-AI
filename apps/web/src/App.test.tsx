// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
describe("App", () => {
  afterEach(() => localStorage.clear());
  it("renders accessible demo login", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/login"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: /Entrar no PulseOps AI/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Entrar no ambiente/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue(
      "operator@pulseops.local",
    );
  });
});
