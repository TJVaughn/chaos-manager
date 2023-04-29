import { Component, createSignal, onMount } from "solid-js";
import styles from "../App.module.css"

export const AddTaskInput: Component<{ handleInputSubmit: CallableFunction; shouldFocus: boolean }> = (
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
