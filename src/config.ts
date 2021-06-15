const { NODE_ENV = "development" } = process.env;

const serverUrls: { [key: string]: string } = {
    production: "https://server.api.raiinmaker.com",
    staging: "https://server-staging.api.raiinmaker.com",
    development: "http://localhost:4000",
};

export const serverBaseUrl = serverUrls[NODE_ENV] || serverUrls["development"];
