import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AcademicContextProvider } from "./context/AcademicContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AcademicContextProvider>
      <RouterProvider router={router} />
    </AcademicContextProvider>
  </React.StrictMode>,
);
