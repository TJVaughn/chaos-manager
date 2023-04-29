import { Component } from "solid-js";
import { Routes, Route, A } from "@solidjs/router";
import styles from "./App.module.css";
import { Home } from "./components/Home";
import { Calendar } from "./components/Calendar";
import { TaskEditorCanvas } from "./components/TaskEditorCanvas";
import { ScheduleEditor } from "./ScheduleEditor";

const App: Component = () => {
    return (
        <div class={styles.App}>
            <div class={styles.Navbar}>
                <A href="/">Chaos Manager</A> | <A href="/focus">Focus</A>
            </div>
            <div class={styles.spacer}></div>
            <Routes>
                <Route
                    path="/"
                    component={Home}
                />
                <Route
                    path="/focus"
                    component={Calendar}
                />
                <Route
                    path="/editor/task/*"
                    element={<TaskEditorCanvas type="task" />}
                />
                <Route
                    path="/editor/category/*"
                    element={<TaskEditorCanvas type="category" />}
                />
                <Route
                    path="/editor/schedule/*"
                    component={ScheduleEditor}
                />
            </Routes>
        </div>
    );
};

export default App;
