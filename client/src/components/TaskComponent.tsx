import { A } from "@solidjs/router";
import { Component } from "solid-js";
import styles from "../App.module.css";
import { Task } from "./types";

export const TaskComponent: Component<{
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

