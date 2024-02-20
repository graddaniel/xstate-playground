import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { ProjectTransition } from './graph';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): any {
    return this.appService.getHello();
  }

  @Get('/start')
  start(): any {
    return this.appService.goToState(ProjectTransition.START);
  }

  @Get('/finish')
  finish(): any {
    return this.appService.goToState(ProjectTransition.FINISH);
  }
}
