import { NavLink, Outlet } from "react-router-dom";

function Root() {
  return (
    <>
      <nav>
        <ul>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? "underline" : "")}
            >
              Gather and convert
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/move"
              className={({ isActive }) => (isActive ? "underline" : "")}
            >
              Move files
            </NavLink>
          </li>
        </ul>
      </nav>

      <main>
        <Outlet />
      </main>
    </>
  );
}

export default Root;
