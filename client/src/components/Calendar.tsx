import { Component, createSignal,  For,  onMount, ParentComponent } from "solid-js";
import { Category, Duration, Task } from "../types/types";
import apiUtil from "../utils/apiUtil";
import styles from "../App.module.css";
import { CategoryComponent } from "./CategoryComponent";
import { A } from "@solidjs/router";
import { daysOfWeek } from "../utils/daysOfWeek";


export const Calendar: Component = () => {
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

