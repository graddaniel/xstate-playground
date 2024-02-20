import { Module } from "@nestjs/common";
import { StateMachineService } from "./state-machine.service";
import { StateMachineController } from "./state-machine.controller";

@Module({
    controllers: [StateMachineController],
    providers: [StateMachineService],
})
export class StateMachineModule {}
