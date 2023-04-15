import { Component, For, onMount, createSignal, ParentComponent, createEffect } from "solid-js";
import { Routes, Route, A } from "@solidjs/router";
import styles from "./App.module.css";
import axios from "axios";
import { EditSVG } from "./components/EditSVG";

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
        props.handleItemClick(props.item);
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
    const [catSettingsDropDown, setCatSettingsDropDown] = createSignal(false);
    const [easyDeleteTasks, setEasyDeleteTasks] = createSignal(false);
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

    const handleItemClick = async (item: Task) => {
        if (!easyDeleteTasks()) {
            return (window.location.href = `/editor/task/${item.id}`);
        }

        console.log("delete item: ", item.title);
        await api.delete(`/task/${item.id}`);
        categoryDataRefresh();
        // let taskArray = [...category.tasks_todo];
        // let completedTasksArr = [...category.tasks_done];
        // if (is_complete) {
        //     completedTasksArr[index].is_complete = !completedTasksArr[index].is_complete;
        //     let item = completedTasksArr.splice(index, 1);
        //     taskArray.push(item[0]);
        // } else {
        //     taskArray[index].is_complete = !taskArray[index].is_complete;
        //     let item = taskArray.splice(index, 1);
        //     completedTasksArr.unshift(item[0]);
        // }
        // let newCategory = { ...category };

        // newCategory.tasks_todo = taskArray;
        // newCategory.tasks_done = completedTasksArr;
        // updateCategory(newCategory, categoryIndex);
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
        <div class={styles.category}>
            <div class={styles.categoryHeader}>
                <A
                    onClick={handleCategoryClick}
                    href={`/category/${props.category.id}`}
                >
                    {props.category.title}{" "}
                </A>
                <button
                    onClick={() => {
                        setCatSettingsDropDown(!catSettingsDropDown());
                        setEasyDeleteTasks(!easyDeleteTasks());
                    }}
                >
                    <EditSVG />
                </button>
                {catSettingsDropDown() ? (
                    <div>
                        <button onClick={() => setEasyDeleteTasks(!easyDeleteTasks())}>
                            start easy delete?
                        </button>
                        <span class={styles.smallText}>click to delete tasks</span>
                    </div>
                ) : (
                    ""
                )}
            </div>
            <div
                style={
                    easyDeleteTasks()
                        ? {
                              background: "red",
                          }
                        : {}
                }
                class={styles.categoryTask}
            >
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
                <br />
                <br />
                <br />
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

type Duration = {
    id: number;
    owner_id: number;
    category_id: number;
    start_hour: number;
    end_hour: number;
    day_as_int: number;
    color: string;
    titles: string[];
};

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Calendar: Component = () => {
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);
    const [currDay, _setCurrDay] = createSignal(new Date().getDay());
    const [currHour, _setCurrHour] = createSignal(new Date().getHours());
    const [durations, setDurations] = createSignal<Duration[]>();

    const api = apiUtil();

    onMount(async () => {
        setTimeout(() => {
            if (currHour() > 20) {
                window.scrollTo(0, currHour() * 70);
            } else {
                window.scrollTo(0, currHour() * 30);
            }
        }, 150);

        const durs: Duration[] = await api.get("/durations");
        const cats: Category[] = await api.get("/categories");

        for (const dur of durs) {
            for (const cat of cats) {
                if (dur.category_id === cat.id) {
                    dur.titles = [];
                    dur.titles.push(cat.title);
                    for (let i = 0; i < 2; i++) {
                        if (cat.tasks_todo[i]) {
                            dur.titles.push(cat.tasks_todo[i].title);
                        }
                    }
                }
            }
        }
        setDurations(durs);
    });

    const handleAddCalEvent = () => {
        window.location.href = "/editor/schedule";
    };

    return (
        <div>
            <div class={styles.daysNamesContainer}>
                <span></span>
                {daysOfWeek.map((day, index) => (
                    <div
                        class={`${styles.calheader} ${
                            currDay() === index ? styles.hourBlockCurrDay : ""
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>
            <div class={styles.spacer}></div>
            <div class={styles.calContentContainer}>
                <div class={styles.hoursContainer}>
                    {hours()!.map((hour) => (
                        <div>
                            <div>{hour}</div>
                        </div>
                    ))}
                </div>
                {daysOfWeek.map((_, dayIndex) => {
                    return (
                        <div class={styles.daysContainer}>
                            {hours().map((_, hourIndex) => {
                                const { isMatch, dur, display } = isDurationThisDayThisHour(
                                    durations()!,
                                    dayIndex,
                                    hourIndex,
                                );

                                if (isMatch && dur) {
                                    return (
                                        <EmptyHourBlock
                                            currDay={currDay()}
                                            currHour={currHour()}
                                            hourIndex={hourIndex}
                                            dayIndex={dayIndex}
                                        >
                                            <DurationHourBlock
                                                currDay={currDay()}
                                                currHour={currHour()}
                                                hourIndex={hourIndex}
                                                dayIndex={dayIndex}
                                                titles={dur.titles}
                                                shouldDisplayTitle={display}
                                                color={dur.color}
                                            />
                                        </EmptyHourBlock>
                                    );
                                }
                                return (
                                    <EmptyHourBlock
                                        currDay={currDay()}
                                        currHour={currHour()}
                                        hourIndex={hourIndex}
                                        dayIndex={dayIndex}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <AddCalEventButton addCalEvent={handleAddCalEvent} />
        </div>
    );
};

const isDurationThisDayThisHour = (durations: Duration[], currDay: number, currHour: number) => {
    for (const i in durations) {
        const startHour = durations[i].start_hour;
        const endHour = durations[i].end_hour;

        if (durations[i].day_as_int === currDay) {
            if (startHour === currHour) {
                return {
                    isMatch: true,
                    dur: durations[i],
                    display: true,
                };
            }
            if (endHour - 1 === currHour) {
                return {
                    isMatch: true,
                    dur: durations[i],
                    display: false,
                };
            }
            if (currHour > startHour && currHour < endHour) {
                return {
                    isMatch: true,
                    dur: durations[i],
                    display: false,
                };
            }
        }
    }
    return {
        isMatch: false,
        dur: null,
        display: false,
    };
};

const DurationHourBlock: Component<{
    currHour: number;
    hourIndex: number;
    currDay: number;
    dayIndex: number;
    titles: string[];
    shouldDisplayTitle: boolean;
    color: string;
}> = (props) => {
    const { currHour, hourIndex, currDay, dayIndex, titles, shouldDisplayTitle, color } = props;
    return (
        <div
            id={currHour - 1 === hourIndex && currDay === dayIndex ? "scrollTo" : ""}
            class={`${styles.hourBlock} ${currDay === dayIndex ? styles.hourBlockCurrDay : ""} ${
                currHour === hourIndex && currDay === dayIndex ? styles.hourBlockCurrHour : ""
            }`}
            style={{
                "background-color": color,
                opacity: "0.7",
            }}
        >
            <div class={styles.hourBlockContent}>
                <div class={styles.hourBlockInner}>
                    {shouldDisplayTitle
                        ? titles?.map((t) => (
                              <span class={styles.focusTitleList}>
                                  {t}
                                  <hr style={{ margin: "1px 0" }} />
                              </span>
                          ))
                        : ""}
                </div>
            </div>
        </div>
    );
};

const EmptyHourBlock: ParentComponent<{
    currHour: number;
    hourIndex: number;
    currDay: number;
    dayIndex: number;
}> = (props) => {
    const { currHour, hourIndex, currDay, dayIndex } = props;
    return (
        <div
            id={currHour - 1 === hourIndex && currDay === dayIndex ? "scrollTo" : ""}
            class={`${styles.hourBlock} ${currDay === dayIndex ? styles.hourBlockCurrDay : ""} ${
                currHour === hourIndex && currDay === dayIndex ? styles.hourBlockCurrHour : ""
            }`}
        >
            <div class={styles.hourBlockContent}>
                <div>
                    <div class={styles.hourBlockInner}>{props.children}</div>
                </div>
            </div>
        </div>
    );
};

const AddCalEventButton: Component<{ addCalEvent: CallableFunction }> = (props) => {
    return (
        <div
            onClick={() => props.addCalEvent()}
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
    );
};
const ScheduleEditor: Component = () => {
    const [startHour, setStartHour] = createSignal<string>("0");
    const [endHour, setEndHour] = createSignal<string>("1");
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);
    const [daysRecurr, setDaysRecurr] = createSignal<number[]>([...Array(7).fill(0)]);
    const [categories, setCategories] = createSignal<Category[]>();
    const [selectedCat, setSelectedCat] = createSignal<string>();
    const [color, setColor] = createSignal("#00d5ff");

    const api = apiUtil();

    onMount(async () => {
        const categoryReq = await api.get<Category[]>("/categories");
        setCategories(categoryReq);
        setSelectedCat(categoryReq[0].id.toString());
    });
    const handleTimeInput = (value: string, name: "start" | "end") => {
        if (name === "start") {
            setStartHour(value);
        } else {
            setEndHour(value);
        }
    };

    const handleRecurrChange = (evt: any) => {
        setDaysRecurr((prev) => {
            if (prev[evt.currentTarget.name] === 1) {
                prev[evt.currentTarget.name] = 0;
            } else {
                prev[evt.currentTarget.name] = 1;
            }
            return prev;
        });
    };

    const handleCategoryChange = (evt: any) => {
        setSelectedCat(evt.currentTarget.value);
    };

    const handleColorInput = (evt: any) => {
        setColor(evt.currentTarget.value);
    };

    const handleSubmit = async (evt: any) => {
        evt.preventDefault();

        if (parseInt(startHour(), 10) > parseInt(endHour(), 10)) {
            return console.log("start hour greater than end hour");
        }

        const events: any = [];

        for (const i in daysRecurr()) {
            if (daysRecurr()[i] === 1) {
                const newEvent = {
                    category_id: parseInt(selectedCat()!, 10),
                    day_as_int: parseInt(i, 10),
                    color: color(),
                    start_hour: parseInt(startHour(), 10),
                    end_hour: parseInt(endHour(), 10),
                    owner_id: 1,
                };
                events.push(newEvent);
            }
        }

        console.log(events);

        await api.post("/durations", events);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Add category time block</h2>
            <div>When does event occur?</div>
            <br />
            {daysOfWeek.map((day, i) => (
                <label>
                    <input
                        name={i.toString()}
                        onChange={handleRecurrChange}
                        type="checkbox"
                        value={daysRecurr()[i]}
                    />
                    {day}{" "}
                </label>
            ))}
            <br />
            <br />
            <span>Start time: </span>
            <select
                value={startHour()}
                onChange={(evt) => handleTimeInput(evt.currentTarget.value, "start")}
            >
                {hours().map((hour) => (
                    <option value={hour}>{hour}</option>
                ))}
            </select>

            <br />
            <span>End time: </span>
            <select
                value={endHour()}
                onChange={(evt) => handleTimeInput(evt.currentTarget.value, "end")}
            >
                {function () {
                    let hoursPlus = hours();
                    hoursPlus.push(24);
                    hoursPlus.shift();
                    return <span></span>;
                }}
                {hours().map((hour) => (
                    <option value={hour}>{hour}</option>
                ))}
            </select>
            <br />
            <br />
            <div>Category</div>
            <div>
                <select onChange={handleCategoryChange}>
                    {categories()?.map((cat) => {
                        return <option value={cat.id}>{cat.title}</option>;
                    })}
                </select>
            </div>
            <div>
                <input
                    onInput={handleColorInput}
                    type="color"
                    value={color()}
                />
            </div>

            <button>save</button>
        </form>
    );
};

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
