import { NavLink, Outlet } from "react-router-dom";

const navLinkDefaultClass = "inline-block py-4";
const navLinkActiveClass = " border-amber-700 border-b-4";

function Root() {
  return (
    <>
      <nav className="bg-black/20 px-4">
        <ul className="flex space-x-8">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                navLinkDefaultClass + (isActive ? navLinkActiveClass : "")
              }
            >
              Gather and convert
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/move"
              className={({ isActive }) =>
                navLinkDefaultClass + (isActive ? navLinkActiveClass : "")
              }
            >
              Move files
            </NavLink>
          </li>
        </ul>
      </nav>

      <main className="grid gap-y-4 mx-auto my-8 px-8">
        <Outlet />
      </main>
    </>
  );
}

export default Root;
