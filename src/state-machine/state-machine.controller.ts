import { Controller, Get, Param } from "@nestjs/common";
import { StateMachineService } from "./state-machine.service";

@Controller()
export class StateMachineController {
    constructor(private readonly stateMachineService: StateMachineService) {}

    @Get('transition/:transitionName')
    transition(
        @Param('transitionName') transitionName: string,
    ): any {
        return this.stateMachineService.transition_v4(transitionName);
    }
}
