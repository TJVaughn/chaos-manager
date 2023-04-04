import { Component, For, onMount, createSignal, ParentComponent, createEffect } from "solid-js";
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

const AddTaskInput: Component<{ handleInputSubmit: CallableFunction; shouldFocus: boolean }> = (
    props,
) => {
    const [value, setValue] = createSignal("");
    let currentInputRef: HTMLInputElement;

    const handleSubmit = (evt: SubmitEvent) => {
        evt.preventDefault();
        props.handleInputSubmit(value(), currentInputRef);
        setValue("");
    };

    onMount(() => {
        if (props.shouldFocus) {
            currentInputRef.focus();
        }
    });
    return (
        <form
            onSubmit={handleSubmit}
            class={styles.addTaskContainer}
        >
            <input
                ref={currentInputRef!}
                type="text"
                value={value()}
                onChange={(evt) => setValue(evt.currentTarget.value)}
                class={styles.addTaskInput}
                placeholder="add next todo"
            />
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
    focusIdx: number;
}> = (props) => {
    const { category, updateCategory, categoryIndex, categoryDataRefresh, focusIdx } = props;

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
            priority: category.tasks_todo.length,
            category_id: category.id,
            owner_id: category.owner_id,
        });

        if (task.title === target) {
            categoryDataRefresh(categoryIndex);
        }
    };

    const handleCategoryClick = () => {
        window.location.href = `/editor/category/${props.category.id}`;
    };
    return (
        <div
            class={styles.category}
            style={
                category.tasks_done.length + category.tasks_todo.length > 17
                    ? { "overflow-y": "scroll" }
                    : {}
            }
        >
            <div class={styles.categoryHeader}>
                <A
                    onClick={handleCategoryClick}
                    href={`/category/${props.category.id}`}
                >
                    {props.category.title}
                </A>
            </div>
            <div class={styles.categoryTask}>
                <AddTaskInput
                    handleInputSubmit={handleInputSubmit}
                    shouldFocus={categoryIndex === focusIdx ? true : false}
                />
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
    const [focusIdx, setFocusIdx] = createSignal(0);

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

    const handleCategoryDataRefresh = async (focusIndex: number) => {
        setFocusIdx(focusIndex);
        setCategories(await getUpdatedCategories());
    };

    const handleUpdateCategory = async (category: Category, index: number) => {
        if (category.tasks_todo.length > 0) {
            await api.put<Task[]>("/tasks", category.tasks_todo);
        }

        if (category.tasks_done.length > 0) {
            await api.put<Task[]>("/tasks", category.tasks_done);
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
                            focusIdx={focusIdx()}
                        />
                    )}
                </For>
            </header>
            <div>
                {categories() && categories()!.length >= 3 ? (
                    ""
                ) : (
                    <A
                        href="/"
                        onClick={handleAddCategory}
                    >
                        <button>Add Category</button>
                    </A>
                )}
            </div>
        </div>
    );
};

const Calendar: Component = () => {
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);
    const [currDay, _setCurrDay] = createSignal(new Date().getDay());
    const [currHour, _setCurrHour] = createSignal(new Date().getHours());
    const [days, _setDays] = createSignal([
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ]);

    onMount(() => {
        setTimeout(() => {
            window.scrollTo(0, currHour() * 100);
        }, 150);
    });

    const handleAddCalEvent = () => {
        window.location.href = "/editor/schedule";
    };

    return (
        <div>
            <div class={styles.calendarContainer}>
                {days().map((day, index) => (
                    <div class={styles.calheader}>{day}</div>
                ))}
            </div>
            <div class={styles.calendarContainer}>
                {days().map((day, index) => (
                    <div class={styles.calheader}>
                        <div class={styles.calendarHoursContainer}>
                            {hours()!.map((hour, hourIndex) => (
                                <div
                                    id={
                                        currHour() - 1 === hourIndex && currDay() === index
                                            ? "scrollTo"
                                            : ""
                                    }
                                    class={`${styles.hourBlock} ${
                                        currDay() === index ? styles.hourBlockCurrDay : ""
                                    } ${
                                        currHour() === hourIndex && currDay() === index
                                            ? styles.hourBlockCurrHour
                                            : ""
                                    }`}
                                >
                                    {" "}
                                    <div class={styles.hourBlockContent}>{hour}:00</div>
                                    <div class={styles.hourBlockContent}>{hour}:30</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div
                onClick={handleAddCalEvent}
                class={styles.addCalEventButton}
            >
                <svg
                    fill="#46daff"
                    height="50px"
                    width="50px"
                    version="1.1"
                    id="Layer_1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 300.003 300.003"
                >
                    <g
                        id="SVGRepo_bgCarrier"
                        stroke-width="0"
                    ></g>
                    <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                        {" "}
                        <g>
                            {" "}
                            <g>
                                {" "}
                                <path d="M150,0C67.159,0,0.001,67.159,0.001,150c0,82.838,67.157,150.003,149.997,150.003S300.002,232.838,300.002,150 C300.002,67.159,232.839,0,150,0z M213.281,166.501h-48.27v50.469c-0.003,8.463-6.863,15.323-15.328,15.323 c-8.468,0-15.328-6.86-15.328-15.328v-50.464H87.37c-8.466-0.003-15.323-6.863-15.328-15.328c0-8.463,6.863-15.326,15.328-15.328 l46.984,0.003V91.057c0-8.466,6.863-15.328,15.326-15.328c8.468,0,15.331,6.863,15.328,15.328l0.003,44.787l48.265,0.005 c8.466-0.005,15.331,6.86,15.328,15.328C228.607,159.643,221.742,166.501,213.281,166.501z"></path>{" "}
                            </g>{" "}
                        </g>{" "}
                    </g>
                </svg>
            </div>
        </div>
    );
};

const ScheduleEditor: Component = () => {
    const [startHour, setStartHour] = createSignal<string>("0");
    const [startMin, setStartMin] = createSignal<string>("00");
    const [endHour, setEndHour] = createSignal<string>("0");
    const [endMin, setEndMin] = createSignal<string>("00");
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);

    const handleTimeInput = (value: string, name: "start" | "end", type: "hour" | "min") => {
        if (name === "start") {
            if (type === "hour") {
                setStartHour(value);
            } else {
                setStartMin(value);
            }
        } else {
            if (type === "hour") {
                setEndHour(value);
            } else {
                setEndMin(value);
            }
        }
        console.log(`${startHour()}: ${startMin()}`);
        console.log(`${endHour()}: ${endMin()}`);
    };
    return (
        <div>
            <h2>Add category time block</h2>
            <div>Day of week</div>
            <br />

            <div>Reoccuring</div>
            <br />
            <span>Start time: </span>
            <select onChange={(evt) => handleTimeInput(evt.currentTarget.value, "start", "hour")}>
                {hours().map((hour) => (
                    <option value={hour}>{hour}</option>
                ))}
            </select>
            <select onChange={(evt) => handleTimeInput(evt.currentTarget.value, "start", "min")}>
                <option value={"00"}>00</option>
                <option value={"30"}>30</option>
            </select>
            <br />
            <span>End time: </span>
            <select onChange={(evt) => handleTimeInput(evt.currentTarget.value, "end", "hour")}>
                {hours().map((hour) => (
                    <option value={hour}>{hour}</option>
                ))}
            </select>
            <select onChange={(evt) => handleTimeInput(evt.currentTarget.value, "end", "min")}>
                <option value={"00"}>00</option>
                <option value={"30"}>30</option>
            </select>
            <br />
            <br />
            <div>Category</div>
        </div>
    );
};

const App: Component = () => {
    return (
        <div class={styles.App}>
            <div class={styles.Navbar}>
                <A href="/">Chaos Manager</A> | <A href="/calendar">Calendar</A>
            </div>
            <div class={styles.spacer}></div>
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
                <Route
                    path="/editor/schedule/*"
                    component={ScheduleEditor}
                />
            </Routes>
        </div>
    );
};

export default App;
