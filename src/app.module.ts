import { Module } from '@nestjs/common';
import { StateMachineModule as SM } from '@hoeselm/nestjs-state-machine';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatsModule } from './cats/cats.module';
import { PROJECT_GRAPH, ProjectState, ProjectTransition } from './graph';
import { StateMachineModule } from './state-machine/state-machine.module';

@Module({
  imports: [
    CatsModule,
    StateMachineModule,
    SM.forRoot([{
      name: PROJECT_GRAPH,
      initialState: ProjectState.NEW,
      states: [
          ProjectState.NEW,
          ProjectState.IN_PROGRESS,
          ProjectState.DONE
      ],
      transitions: [
          {
              name: ProjectTransition.START,
              from: [ProjectState.NEW],
              to: ProjectState.IN_PROGRESS,
          },
          {
              name: ProjectTransition.FINISH,
              from: [ProjectState.IN_PROGRESS],
              to: ProjectState.DONE,
          }
      ],
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
