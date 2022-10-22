/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import ical, { ICalEventRepeatingFreq, ICalRepeatingOptions } from "ical-generator";

export interface Env {
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            const currentParams = new URLSearchParams(url.search);
            const calendar = ical({name: "calendar"});
            const startDate = currentParams.get("startDate")
            const endDate = currentParams.get("endDate")
            const startTime = currentParams.get("startTime") || ''
            const endTime = currentParams.get("endTime") || ""
            const title = currentParams.get("title");
            const description = currentParams.get("description") || "";
            const where = currentParams.get("where") || "";
            const repeats = currentParams.get("repeats") as ICalEventRepeatingFreq || undefined;
            const customRepeatFrequency = currentParams.get("customRepeatFrequency") || undefined;

            if (!startDate || !endDate || !title) {
                return new Response("Missing required parameters");
            }

            const isAllDay = !startTime || !endTime;
            const whereIsURL = isURL(where);

            const determinedFreq = parseFrequency(repeats, customRepeatFrequency);

            const event = calendar.createEvent({
                start: isAllDay ? new Date(startDate) : new Date(`${startDate} ${startTime}`),
                end: isAllDay ? new Date(endDate) : new Date(`${endDate} ${endTime}`),
                allDay: isAllDay,
                summary: title,
                url: whereIsURL ? where : undefined,
                location: whereIsURL ? undefined : where,
                description,
            })

            if (determinedFreq?.freq) {
                event.repeating(determinedFreq);
            }

            return new Response(calendar.toString(), {
                headers: {
                    "content-type": "text/calendar;charset=UTF-8",
                    "content-disposition": `attachment; filename="${title}.ics"`,
                }
            })
        }

        return new Response("Not yet handled");
    },
};


const isURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

const parseFrequency = (repeat: ICalEventRepeatingFreq, customFrequency?: string): ICalRepeatingOptions | undefined => {
    try {
        if (customFrequency) {
            const [interval, freq] = customFrequency.split("-");
            return {
                freq: freq as ICalEventRepeatingFreq,
                interval: parseInt(interval, 10)
            }
        }

        return {
            freq: repeat as ICalEventRepeatingFreq,
        }
    } catch (e) {
        return undefined
    }
}
