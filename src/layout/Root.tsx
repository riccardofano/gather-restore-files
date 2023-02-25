import { NavLink, Outlet } from "react-router-dom";
import { appWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

const navLinkDefaultClass = "inline-block py-4";
const navLinkActiveClass = " border-amber-700 border-b-4";

function Root() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unlistenProgress = appWindow.listen<number>("PROGRESS", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlistenProgress.then((res) => res());
    };
  }, []);

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

      <div
        id="progress-bar"
        className={`${
          progress > 0 ? "h-2" : "h-0"
        } bg-green-600 transition-transform ease-in origin-left`}
        style={{
          transform: `scaleX(${progress})`,
        }}
      />

      <main className="grid gap-y-4 mx-auto my-8 px-8">
        <Outlet />
      </main>
    </>
  );
}

export default Root;
