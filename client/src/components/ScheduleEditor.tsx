import { Component, createSignal, onMount } from "solid-js";
import { Category, Duration } from "../types/types";
import apiUtil from "../utils/apiUtil";
import { daysOfWeek } from "../utils/daysOfWeek";

export const ScheduleEditor: Component = () => {
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);
    const [categories, setCategories] = createSignal<Category[]>();
    const [duration, setDuration] = createSignal<Duration>({
        id: -1,
        category_id: 0,
        start_hour: 0,
        end_hour: 1,
        color: "#000000",
        owner_id: 1,
        recurring_days: [0,0,0,0,0,0,0],
        titles: []
    });
    const [id, setId] = createSignal<string>();

    const api = apiUtil();

    onMount(async () => {
        const id = window.location.pathname.split("/editor/schedule/")[1];
        const categoryReq = await api.get<Category[]>("/categories");
        setId(id);
        setCategories(categoryReq);
        if (!id) return console.log("no id");

        const durationReq = await api.get<Duration>(`/duration/${id}`);
        setDuration(durationReq);
    });
    const handleTimeInput = (value: string, name: "start" | "end") => {
        setDuration((prev) => {
            prev!.start_hour = name === "start" ? parseInt(value, 10) : prev!.start_hour;
            prev!.end_hour = name === "end" ? parseInt(value, 10) : prev!.end_hour;

            return prev; 
        });
    };

    const handleRecurrChange = (evt: any) => {
        setDuration((prev) => {
            const rec_days = prev!.recurring_days;

            if (rec_days![evt.currentTarget.name] === 1) {
                rec_days![evt.currentTarget.name] = 0;
            } else {
                rec_days![evt.currentTarget.name] = 1;
            }
            prev!.recurring_days = [...rec_days];
            return prev;

        });
    };

    const handleCategoryChange = (evt: any) => {
        setDuration((prev) => {
            prev!.category_id = parseInt(evt.currentTarget.value, 10);

            return prev; 
        });
    };

    const handleColorInput = (evt: any) => {
        setDuration((prev) => {
            prev!.color = evt.currentTarget.value;

            return prev; 
        });
    };

    const handleSubmit = async (evt: any) => {
        evt.preventDefault();

        if (duration()!.start_hour > duration()!.end_hour) {
            return console.log("start hour greater than end hour");
        }
        const polyDur: Omit<Duration, "titles" | "id"> = {
            color: duration()!.color,
            category_id: duration()!.category_id,
            recurring_days: duration()!.recurring_days,
            start_hour: duration()!.start_hour,
            end_hour:  duration()!.end_hour,
            owner_id: 1,
        };

        if(id()){
            const dur = {
                id:  duration()!.id,
                ...polyDur
            }
            return await api.put("/duration",dur);
        }
        return await api.post("/duration", polyDur);
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
                        value={duration()?.recurring_days[i]}
                        checked={duration()?.recurring_days[i] === 1}
                    />
                    {day}{" "}
                </label>
            ))}
            <br />
            <br />
            <span>Start time: </span>
            <select
                value={duration()?.start_hour}
                onChange={(evt) => handleTimeInput(evt.currentTarget.value, "start")}
            >
                {hours().map((hour) => (
                    <option value={hour}>{hour}</option>
                ))}
            </select>

            <br />
            <span>End time: </span>
            <select
                value={duration()?.end_hour}
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
                <select value={duration()?.category_id} onChange={handleCategoryChange}>
                    {categories()?.map((cat) => {
                        return <option value={cat.id}>{cat.title}</option>;
                    })}
                </select>
            </div>
            <div>
                <input
                    onInput={handleColorInput}
                    type="color"
                    value={duration()?.color}
                />
            </div>

            <button>save</button>
        </form>
    );
};

