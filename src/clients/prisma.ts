import { PrismaClient } from "@prisma/client";
import { getCurrentHub } from "@sentry/node";

const { PG_URL, PG_HOST, PG_PORT, PG_USER, PG_PASSWORD } = process.env;

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: PG_URL || `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/postgres`,
        },
    },
});

// support sentry tracing https://github.com/getsentry/sentry-javascript/issues/3143#issuecomment-886065074
prisma.$use(async (params, next) => {
    const { model, action, runInTransaction, args } = params;
    const description = [model, action].filter(Boolean).join(".");
    const data = {
        model,
        action,
        runInTransaction,
        args,
    };

    const scope = getCurrentHub().getScope();
    const parentSpan = scope?.getSpan();
    const span = parentSpan?.startChild({
        op: "db",
        description,
        data,
    });

    // optional but nice
    scope?.addBreadcrumb({
        category: "db",
        message: description,
        data,
    });

    const result = await next(params);
    span?.finish();

    return result;
});

export const readPrisma = new PrismaClient({
    datasources: {
        db: {
            url: PG_URL || `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/postgres`,
        },
    },
});

// support sentry tracing https://github.com/getsentry/sentry-javascript/issues/3143#issuecomment-886065074
readPrisma.$use(async (params, next) => {
    const { model, action, runInTransaction, args } = params;
    const description = [model, action].filter(Boolean).join(".");
    const data = {
        model,
        action,
        runInTransaction,
        args,
    };

    const scope = getCurrentHub().getScope();
    const parentSpan = scope?.getSpan();
    const span = parentSpan?.startChild({
        op: "db",
        description,
        data,
    });

    // optional but nice
    scope?.addBreadcrumb({
        category: "db",
        message: description,
        data,
    });

    const result = await next(params);
    span?.finish();

    return result;
});
