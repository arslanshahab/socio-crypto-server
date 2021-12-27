import winston from "winston";
import rTracer from "cls-rtracer";
const { combine, timestamp, printf } = winston.format;

const rTracerFormat = printf((info) => {
    const rid = rTracer.id();
    return rid
        ? `${info.timestamp} [${info.level}] [${rid}]: ${info.message}`
        : `${info.timestamp} [${info.level}]: ${info.message}`;
});
const logLevel = process.env.STAGE === "production" ? "info" : "debug";

const logger = winston.createLogger({
    format: combine(timestamp(), rTracerFormat),
    silent: process.env.NODE_ENV === "test",
    transports: [new winston.transports.Console({ level: logLevel })],
});

logger.debug(`Logging initialized at ${logLevel} level`);

export default logger;
