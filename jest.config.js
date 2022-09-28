module.exports = {
    verbose: true,
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: ["/src/", "/node_modules/"],
    moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "node"],
    testEnvironment: "node",
    setupFilesAfterEnv: ["./jest.setup.redis-mock.js"],
    testRegex: "(tests/unit/.*|(\\.|/)(test|spec))\\.[jt]sx?$",
    transform: {
        "\\.(ts)$": "ts-jest",
        // "^.+\\.(t|j)sx?$": ["@swc/jest"]
    },
};
