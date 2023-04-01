/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App, { TaskContextProvider } from "./App";
import { Router } from "@solidjs/router";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?"
    );
}

render(
    () => (
        <TaskContextProvider
            task={{
                title: "Sorry, an error occurred",
                description: "",
                category_id: 1,
                id: 1,
                owner_id: 1,
                priority: 1,
                is_complete: false,
            }}
        >
            <Router>
                <App />
            </Router>
        </TaskContextProvider>
    ),
    root!
);
