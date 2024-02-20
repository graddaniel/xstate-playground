import { Injectable } from '@nestjs/common';
import { StateStore, StateMachineFactory } from '@hoeselm/nestjs-state-machine';
import { PROJECT_GRAPH, ProjectState, ProjectTransition } from './graph';

export class Project {
  constructor(state: ProjectState) {
    this.state = state;
  }
    name: string;

    @StateStore(PROJECT_GRAPH)
    state: string;

}

@Injectable()
export class AppService {
  projectStateMachine: any;
  constructor(
    private readonly stateMachineFactory: StateMachineFactory,
  ) {
  }

  getHello(): string {
    return 'Hello World!';
  }

  async goToState(state: ProjectTransition) {
    const project = new Project(ProjectState.NEW);
    this.projectStateMachine = this.stateMachineFactory.create<Project>(
      project,
      PROJECT_GRAPH,
    )

    const transitions = await this.projectStateMachine.getAvailableTransitions();
    console.log("TRANSITIONS", transitions);

    const can = await this.projectStateMachine.can(state);
    console.log("CAN", can);

    const result = await this.projectStateMachine.apply(state);
    console.log("RESULT", result, project);

    this.projectStateMachine = null;
    return "State change finished";
  }
}
