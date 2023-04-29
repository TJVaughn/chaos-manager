import { Component, createSignal,  For,  onMount } from "solid-js";
import { Category, Task } from "../types/types";
import apiUtil from "../utils/apiUtil";
import styles from "../App.module.css";
import { CategoryComponent } from "./CategoryComponent";
import { A } from "@solidjs/router";


export const Home: Component = () => {
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
                        <CategoryComponent
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

