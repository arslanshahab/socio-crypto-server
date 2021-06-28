import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { Xoxoday } from "../clients/xoxoday";

export const initXoxoday = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const data = await Xoxoday.getAccessToken(code);
        res.status(200).json(data);
    } catch (error) {
        res.status(403).json(error.message);
    }
});
