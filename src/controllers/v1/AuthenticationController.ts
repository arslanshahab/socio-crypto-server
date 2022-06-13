import { Controller } from "@tsed/di";
import { Post, Returns } from "@tsed/schema";
import { SuccessResult } from "../../util/entities";

@Controller("/auth")
export class AuthenticationController {
    @Post("/login")
    @(Returns(200, SuccessResult).Of(Object))
    public async login() {
        console.log("login endpoint---------");
    }
}
