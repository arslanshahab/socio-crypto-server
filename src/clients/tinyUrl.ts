import fetch from "node-fetch";

export class TinyUrl {
    public static async shorten(url: string) {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`An error occurred while generating the tiny url: ${res.statusText}`);
        return res.text();
    }

    public static async resolve(url: string) {
        const res = await fetch(url);
        if (!res.headers.get("location")) throw new Error("Tiny URL not found");
        return res.headers.get("location");
    }
}
