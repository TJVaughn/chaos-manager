import { Component, createSignal, onMount } from "solid-js";
import { Category, Duration } from "../types/types";
import apiUtil from "../utils/apiUtil";
import { daysOfWeek } from "../utils/daysOfWeek";

export const ScheduleEditor: Component = () => {
    const [startHour, setStartHour] = createSignal<string>("0");
    const [endHour, setEndHour] = createSignal<string>("1");
    const [hours, _setHours] = createSignal<number[]>([...Array(24).keys()]);
    const [daysRecurr, setDaysRecurr] = createSignal<number[]>([...Array(7).fill(0)]);
    const [categories, setCategories] = createSignal<Category[]>();
    const [selectedCat, setSelectedCat] = createSignal<string>();
    const [color, setColor] = createSignal("#00d5ff");
    const [duration, setDuration] = createSignal<Duration>();
    const [id, setId] = createSignal<string>();

    const api = apiUtil();

    onMount(async () => {
        const id = window.location.pathname.split("/editor/schedule/")[1];
        const categoryReq = await api.get<Category[]>("/categories");
        setId(id);
        setCategories(categoryReq);
        if (!id) return console.log("no id");

        const durationReq = await api.get<Duration>(`/duration/${id}`);

        setColor(durationReq.color);
        setDaysRecurr(durationReq.recurring_days);
        setStartHour(durationReq.start_hour.toString());
        setEndHour(durationReq.end_hour.toString());
        setSelectedCat(durationReq.category_id.toString());
        setDuration(durationReq);
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
        const polyDur: Omit<Duration, "titles" | "id"> = {
            color: color(),
            category_id: parseInt(selectedCat()!, 10),
            recurring_days: daysRecurr(),
            start_hour: parseInt(startHour(), 10),
            end_hour: parseInt(endHour(), 10),
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
                        value={daysRecurr()[i]}
                        checked={daysRecurr()[i] === 1}
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
                <select value={selectedCat()} onChange={handleCategoryChange}>
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

