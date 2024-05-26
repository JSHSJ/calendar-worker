/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import ical, {
    ICalEventRepeatingFreq,
    ICalRepeatingOptions,
    ICalCalendarMethod,
} from "ical-generator";

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
            calendar.method(ICalCalendarMethod.REQUEST);

            const start = currentParams.get("start")
            const end = currentParams.get("end")
            const isAllDay = currentParams.get("allDay") === 'true';
            const title = currentParams.get("title");
            const description = currentParams.get("description") || "";
            const where = currentParams.get("where") || "";
            const repeats = currentParams.get("repeats") as ICalEventRepeatingFreq || undefined;
            const customRepeatFrequency = currentParams.get("customRepeatFrequency") || undefined;

            if (!start || !end || !title) {
                return new Response("Missing required parameters");
            }

            const whereIsURL = isURL(where);

            const determinedFreq = parseFrequency(repeats, customRepeatFrequency);

            const event = calendar.createEvent({
                start:  new Date(start),
                end: new Date(end),
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
