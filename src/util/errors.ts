export class FailureByDesign extends Error {
    public code: string;
    public message: string;

    public constructor(code: string, message: any) {
        super(message);
        this.code = code || "FAILURE_BY_DESIGN";
        this.message = message || "";
    }
}
