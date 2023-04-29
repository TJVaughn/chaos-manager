import { Component, createSignal, For } from "solid-js";
import { Category, Task, TaskData } from "../types/types";
import apiUtil from "../utils/apiUtil";
import styles from "../App.module.css";
import { A } from "@solidjs/router";
import { EditSVG } from "./EditSVG";
import { AddTaskInput } from "./AddTaskInput";
import { TaskComponent } from "./TaskComponent";

export const CategoryComponent: Component<{
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
                        <TaskComponent
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
                        <TaskComponent
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

