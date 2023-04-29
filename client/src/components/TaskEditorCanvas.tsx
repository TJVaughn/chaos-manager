import { Component, createSignal,  onMount, ParentComponent } from "solid-js";
import { Task } from "../types/types";
import apiUtil from "../utils/apiUtil";
import styles from "../App.module.css";

export const TaskEditorCanvas: Component<{ type: "task" | "category" }> = (props) => {
    const api = apiUtil();
    const defaultTaskState: Task = {
        title: "loading...",
        description: "",
        category_id: 1,
        id: 1,
        owner_id: 1,
        priority: 1,
        is_complete: false,
    };
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

