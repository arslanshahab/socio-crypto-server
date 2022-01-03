import { Request, Response, NextFunction } from "express";
import logger from "../util/logger";

export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err) {
        console.log(err);
        logger.debug("Stack trace:", err.stack || "Unknown");
        logger.error(JSON.stringify(err));
        return res.status(500).send(err.message);
    }
    return next();
};
