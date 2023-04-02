import { Component, For, onMount, createSignal, ParentComponent } from "solid-js";
import { Routes, Route, A } from "@solidjs/router";
import styles from "./App.module.css";
import axios from "axios";

type TaskData = {
    title: string;
    description: string;
    is_complete: boolean;
    priority: number;
    owner_id: number;
    category_id: number;
};

type Task = TaskData & {
    id: number;
};

type Category = {
    id: number;
    title: string;
    description: string;
    priority: number;
    owner_id: number;
    tasks_todo: Task[];
    tasks_done: Task[];
};

function apiUtil() {
    const api = {
        get: async function get<T>(endpoint: string): Promise<T> {
            const req = await fetch(`http://localhost:8080${endpoint}`);
            const data = await req.json();
            return data;
        },
        post: async function post<T, RT>(endpoint: string, data: T): Promise<RT> {
            const req = await axios({
                url: `http://localhost:8080${endpoint}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                data,
            });
            return req.data;
        },
        put: async function put<T>(endpoint: string, data: T): Promise<T> {
            const req = await axios({
                url: `http://localhost:8080${endpoint}`,
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                data,
            });
            return req.data;
        },
        delete: async function deletElement<T>(endpoint: string): Promise<T> {
            const req = await axios({
                url: `http://localhost:8080${endpoint}`,
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            return req.data;
        },
    };

    return api;
}

const defaultTaskState: Task = {
    title: "loading...",
    description: "",
    category_id: 1,
    id: 1,
    owner_id: 1,
    priority: 1,
    is_complete: false,
};

const AddTaskInput: Component<{ handleInputSubmit: CallableFunction }> = (props) => {
    const [value, setValue] = createSignal("");
    const handleSubmit = (evt: SubmitEvent) => {
        evt.preventDefault();
        props.handleInputSubmit(value());
        setValue("");
    };
    return (
        <form
            onSubmit={handleSubmit}
            class={styles.addTaskContainer}
        >
            <input
                type="text"
                value={value()}
                onChange={(evt) => setValue(evt.currentTarget.value)}
                class={styles.addTaskInput}
                placeholder="add next todo"
            />
            {/* <button>Add</button> */}
        </form>
    );
};

const Task: Component<{
    item: Task;
    index: number;
    startComponent: any;
    endComponent: any;
    movElement: CallableFunction;
    setEndComponent: CallableFunction;
    handleItemClick: CallableFunction;
    setStartComponent: CallableFunction;
}> = (props) => {
    const handleDragStart = () => {
        props.setStartComponent({ item: props.item, index: props.index });
    };
    const handleDragEnd = () => {
        props.movElement(props.startComponent, props.endComponent);
    };

    const handleDragOver = () => {
        props.setEndComponent({ item: props.item, index: props.index });
    };

    const handleClick = () => {
        console.log(props.item);
        window.location.href = `/editor/task/${props.item.id}`;
    };
    return (
        <div
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            draggable={true}
            onClick={handleClick}
            class={styles.taskContainer}
        >
            <A
                class={`${styles.taskTitle} ${
                    props.item.is_complete ? styles.taskTitleComplete : ""
                }`}
                href={`/editor/task/${props.item.id}`}
                onClick={handleClick}
            >
                {props.item.is_complete ? <s>{props.item.title}</s> : props.item.title}
            </A>
        </div>
    );
};

const Category: Component<{
    category: Category;
    updateCategory: (category: Category, index: number) => void;
    categoryDataRefresh: CallableFunction;
    categoryIndex: number;
}> = (props) => {
    const { category, updateCategory, categoryIndex, categoryDataRefresh } = props;

    const [startComponent, setStartComponent] = createSignal({
        item: "",
        index: 0,
    });
    const [endComponent, setEndComponent] = createSignal({
        item: "",
        index: 0,
    });
    const api = apiUtil();

    const reorderTaskInArray = (array: Task[], startIndex: number, endIndex: number) => {
        let newTasksArr = array;
        let task = newTasksArr.splice(startIndex, 1);
        if (endIndex !== 0) {
            let frontHalf = newTasksArr.splice(0, endIndex);
            let array = [...frontHalf, task[0], ...newTasksArr];
            for (const i in array) {
                array[i].priority = parseInt(i, 10);
            }
            return array;
        } else {
            newTasksArr.unshift(task[0]);
            const array = [...newTasksArr];
            for (const i in array) {
                array[i].priority = parseInt(i, 10);
            }
            return array;
        }
    };
    const movElementPosition = (
        startComponent: { item: Task; index: number },
        endComponent: { item: Task; index: number },
    ) => {
        const nCategory = { ...category };

        if (startComponent.item.is_complete !== endComponent.item.is_complete) {
            // pop from current arry and insert in other array
            // change is_complete state

            if (startComponent.item.is_complete) {
                const task = nCategory.tasks_done.splice(startComponent.index, 1);
                task[0].is_complete = !task[0].is_complete;
                nCategory.tasks_todo = [task[0], ...nCategory.tasks_todo];
                nCategory.tasks_done = [...nCategory.tasks_done];
                updateCategory(nCategory, categoryIndex);
            } else {
                const task = nCategory.tasks_todo.splice(startComponent.index, 1);
                task[0].is_complete = !task[0].is_complete;
                nCategory.tasks_todo = [...nCategory.tasks_todo];
                nCategory.tasks_done = [task[0], ...nCategory.tasks_done];
                updateCategory(nCategory, categoryIndex);
            }
        } else {
            if (startComponent.item.is_complete && startComponent.index !== endComponent.index) {
                // move to new index and shift everything down
                nCategory.tasks_done = reorderTaskInArray(
                    category.tasks_done,
                    startComponent.index,
                    endComponent.index,
                );
                updateCategory(nCategory, categoryIndex);
            } else {
                nCategory.tasks_todo = reorderTaskInArray(
                    category.tasks_todo,
                    startComponent.index,
                    endComponent.index,
                );
                updateCategory(nCategory, categoryIndex);
            }
        }
    };

    const handleItemClick = (index: number, is_complete: boolean) => {
        let taskArray = [...category.tasks_todo];
        let completedTasksArr = [...category.tasks_done];
        if (is_complete) {
            completedTasksArr[index].is_complete = !completedTasksArr[index].is_complete;
            let item = completedTasksArr.splice(index, 1);
            taskArray.push(item[0]);
        } else {
            taskArray[index].is_complete = !taskArray[index].is_complete;
            let item = taskArray.splice(index, 1);
            completedTasksArr.unshift(item[0]);
        }
        let newCategory = { ...category };

        newCategory.tasks_todo = taskArray;
        newCategory.tasks_done = completedTasksArr;
        updateCategory(newCategory, categoryIndex);
    };

    const handleInputSubmit = async (target: string) => {
        let task = await api.post<TaskData, TaskData>("/task", {
            title: target,
            description: "",
            is_complete: false,
            priority: 1,
            category_id: category.id,
            owner_id: category.owner_id,
        });

        if (task.title === target) {
            categoryDataRefresh();
        }
    };

    const handleCategoryClick = () => {
        window.location.href = `/editor/category/${props.category.id}`;
    };
    return (
        <div class={styles.category}>
            <div class={styles.categoryHeader}>
                <A
                    onClick={handleCategoryClick}
                    href={`/category/${props.category.id}`}
                >
                    {props.category.title}
                </A>
            </div>
            <div class={styles.categoryTask}>
                <For
                    each={props.category.tasks_todo}
                    fallback={<div>No items, add a task</div>}
                >
                    {(item, index) => (
                        <Task
                            item={item}
                            index={index()}
                            handleItemClick={handleItemClick}
                            setStartComponent={setStartComponent}
                            setEndComponent={setEndComponent}
                            startComponent={startComponent()}
                            endComponent={endComponent()}
                            movElement={movElementPosition}
                        />
                    )}
                </For>
                <AddTaskInput handleInputSubmit={handleInputSubmit} />
                <hr />
                <For
                    each={props.category.tasks_done}
                    fallback={<div>Nothin done yet</div>}
                >
                    {(item, index) => (
                        <Task
                            item={item}
                            index={index()}
                            handleItemClick={handleItemClick}
                            setStartComponent={setStartComponent}
                            setEndComponent={setEndComponent}
                            startComponent={startComponent()}
                            endComponent={endComponent()}
                            movElement={movElementPosition}
                        />
                    )}
                </For>
            </div>
        </div>
    );
};

const TaskEditorCanvas: Component<{ type: "task" | "category" }> = (props) => {
    const api = apiUtil();

    const [deletePrompt, setDeletePrompt] = createSignal<boolean>(false);
    const [element, setElement] = createSignal<Task>(defaultTaskState);

    onMount(async () => {
        if (props.type === "task") {
            const id = window.location.pathname.split("/editor/task/")[1];
            setElement(await api.get(`/task/${id}`));
            return;
        }
        const id = window.location.pathname.split("/editor/category/")[1];
        setElement(await api.get(`/category/${id}`));
        return;
    });

    const handleSelect = async (value: string) => {
        if (value === "0") {
            const task = { ...element() };
            task.is_complete = false;
            setElement(task);
            await handleSubmit();
            return;
        }
        const task = { ...element() };
        task.is_complete = true;
        setElement(task);
        await handleSubmit();
    };

    const handleSubmit = async () => {
        // evt.preventDefault();
        if (props.type === "task") {
            const task = await api.put<Task>("/task", element());
            console.log(task);
            return;
        }
        const cat = await api.put(`/category/${element().id}`, element());
        console.log(cat);
        return;
    };

    const handleInput = (value: string, name: "title" | "description") => {
        const task = { ...element() };
        task[name] = value;
        setElement(task);
    };

    const handleDelete = async () => {
        if (props.type === "task") {
            await api.delete(`/task/${element().id}`);
        } else {
            await api.delete(`/category/${element().id}`);
        }
        window.location.href = "/";
    };

    const handleCategoryPrioritySelect = (priorities: number[]) => {
        console.log(priorities);
    };

    return (
        <>
            <h2>Edit {props.type}</h2>
            <FormWrapper onSubmit={handleSubmit}>
                <button>save</button>
                <br />
                <br />
                <TextInput
                    value={element().title}
                    onInput={handleInput}
                    name="title"
                    type="input"
                    onFocusLost={handleSubmit}
                />
                <br />
                <br />
                <TextInput
                    value={element().description}
                    onInput={handleInput}
                    name="description"
                    type="textarea"
                    onFocusLost={handleSubmit}
                />
                {typeof element().is_complete === "undefined" ? (
                    <SelectPriority
                        onSelect={handleCategoryPrioritySelect}
                        priorities={[1, 2, 3]}
                        priority={element().priority}
                    />
                ) : (
                    <SelectInput
                        is_complete={element().is_complete}
                        onSelect={handleSelect}
                    />
                )}
                <div>
                    {deletePrompt() ? (
                        <div>
                            <p>are you sure?</p>
                            <button onClick={handleDelete}>yes, delete</button>
                        </div>
                    ) : (
                        <button onClick={() => setDeletePrompt(!deletePrompt())}>delete</button>
                    )}
                </div>
            </FormWrapper>
        </>
    );
};

const SelectPriority: Component<{
    onSelect: CallableFunction;
    priorities: number[];
    priority: number;
}> = (props) => {
    return (
        <div>
            Priority:{" "}
            <select onChange={(evt) => props.onSelect(evt.currentTarget.value)}>
                {props.priorities.map((item) => (
                    <option
                        selected={props.priority === item}
                        value={item}
                    >
                        {item}
                    </option>
                ))}
            </select>
        </div>
    );
};

const SelectInput: Component<{ onSelect: CallableFunction; is_complete: boolean }> = (props) => {
    return (
        <div>
            Status:{" "}
            <select onChange={(evt) => props.onSelect(evt.currentTarget.value)}>
                <option
                    value={0}
                    selected={!props.is_complete}
                >
                    to do
                </option>
                <option
                    value={1}
                    selected={props.is_complete}
                >
                    complete
                </option>
            </select>
        </div>
    );
};

const FormWrapper: ParentComponent<{ onSubmit: CallableFunction }> = (props) => {
    const handleSubmit = (evt: any) => {
        evt.preventDefault();
        props.onSubmit(evt);
    };

    return <form onSubmit={handleSubmit}>{props.children}</form>;
};

const TextInput: Component<{
    onInput: (value: string, name: "title" | "description") => void;
    value: string;
    name: "title" | "description";
    type: "input" | "textarea";
    onFocusLost: CallableFunction;
}> = (props) => {
    if (props.type === "input") {
        return (
            <input
                class={styles.editTaskInputTitle}
                type="text"
                value={props.value}
                placeholder={props.value}
                name={props.name}
                onFocusOut={() => props.onFocusLost()}
                onInput={(evt) => {
                    props.onInput(evt.currentTarget.value, props.name);
                }}
            />
        );
    }
    return (
        <textarea
            class={styles.editTaskInputDescription}
            value={props.value}
            placeholder={props.value}
            name={props.name}
            onFocusOut={() => props.onFocusLost()}
            onInput={(evt) => {
                props.onInput(evt.currentTarget.value, props.name);
            }}
        />
    );
};

const Home: Component = () => {
    const api = apiUtil();

    const [categories, setCategories] = createSignal<Category[]>();

    const getUpdatedCategories = async () => {
        const categories = await api.get<Category[]>("/categories");

        for (let i = 0; i < categories.length; i++) {
            categories[i].tasks_done.sort((a, b) => a.priority - b.priority);
            categories[i].tasks_todo.sort((a, b) => a.priority - b.priority);
        }

        return categories;
    };

    onMount(async () => {
        setCategories(await getUpdatedCategories());
    });

    const handleCategoryDataRefresh = async () => {
        setCategories(await getUpdatedCategories());
    };

    const handleUpdateCategory = async (category: Category, index: number) => {
        if (category.tasks_todo.length > 0) {
            await api.put<Task[]>("/task", category.tasks_todo);
        }

        if (category.tasks_done.length > 0) {
            await api.put<Task[]>("/task", category.tasks_done);
        }

        if (typeof categories() !== "undefined" && categories()!.length > 0) {
            const newCategories = [...categories()!];
            newCategories[index] = category;
            console.log(newCategories);
            setCategories([...newCategories]);
        }
    };

    const handleAddCategory = async () => {
        const id = await api.post<Omit<Category, "id">, number>("/category", {
            title: "title",
            description: "description",
            priority: categories()!.length,
            tasks_done: [],
            tasks_todo: [],
            owner_id: 1,
        });

        window.location.href = `/editor/category/${id}`;
    };

    return (
        <div>
            <header
                class={styles.header}
                style={
                    categories() && categories()!.length > 3
                        ? { "justify-content": "flex-start" }
                        : { "justify-content": "space-evenly" }
                }
            >
                <For
                    each={categories()}
                    fallback={<div>No categories found</div>}
                >
                    {(item, index) => (
                        <Category
                            updateCategory={handleUpdateCategory}
                            categoryDataRefresh={handleCategoryDataRefresh}
                            category={item}
                            categoryIndex={index()}
                        />
                    )}
                </For>
            </header>
            <div>
                <A
                    href="/"
                    onClick={handleAddCategory}
                >
                    <button>Add Category</button>
                </A>
            </div>
        </div>
    );
};

const Calendar: Component = () => {
    return <div>Calendar</div>;
};

const App: Component = () => {
    return (
        <div class={styles.App}>
            <div class={styles.Navbar}>
                <A href="/">Chaos Manager</A> | <A href="/calendar">Calendar</A>
            </div>
            <Routes>
                <Route
                    path="/"
                    component={Home}
                />
                <Route
                    path="/calendar"
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
            </Routes>
        </div>
    );
};

export default App;
