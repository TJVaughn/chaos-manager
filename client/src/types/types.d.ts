
export type TaskData = {
    title: string;
    description: string;
    is_complete: boolean;
    priority: number;
    owner_id: number;
    category_id: number;
};

export type Task = TaskData & {
    id: number;
};

export type Category = {
    id: number;
    title: string;
    description: string;
    priority: number;
    owner_id: number;
    tasks_todo: Task[];
    tasks_done: Task[];
};

export type DurationSplit = {
    id: number;
    owner_id: number;
    category_id: number;
    start_hour: number;
    end_hour: number;
    day_as_int: number;
    color: string;
    titles: string[];
};

export type Duration = {
    id: number;
    owner_id: number;
    category_id: number;
    start_hour: number;
    end_hour: number;
    recurring_days: number[];
    color: string;
    titles: string[];
};

