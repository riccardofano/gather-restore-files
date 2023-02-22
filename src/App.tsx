import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./layout/Root";

import "./App.css";
import Convert from "./pages/Convert";
import Move from "./pages/Move";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { path: "/", element: <Convert /> },
      { path: "move", element: <Move /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
