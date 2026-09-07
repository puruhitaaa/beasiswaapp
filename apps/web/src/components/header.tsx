import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { label: "Home", to: "/" },
    { label: "Applicant Portal", to: "/applicant" },
  ] as const;

  return (
    <header className="border-bottom">
      <div className="container-fluid d-flex align-items-center justify-content-between px-3 py-2">
        <nav className="d-flex align-items-center gap-3">
          {links.map(({ to, label }) => 
            (
              <Link
                key={to}
                to={to}
                className="nav-link text-body text-decoration-none"
                activeProps={{
                  className: "nav-link text-body text-decoration-none fw-bold",
                }}
              >
                {label}
              </Link>
            )
          )}
        </nav>
        <div className="d-flex align-items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
