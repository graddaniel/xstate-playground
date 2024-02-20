import { Injectable } from "@nestjs/common";
import {
    createActor,
    setup,
} from 'xstate';
import { createMachine as createMachine_v4 } from '@xstate/fsm'

const CASE = Object.freeze({
    DRAFT: 'draft',
    REVIEW_IN_PROGRESS: 'reviewInProgress',
    CLOSED: 'closed',
    CLOSED_DEAD: 'closedDead',
    ESCALATED: 'escalated',
    INSURANCE_PENDING: 'insurancePending',
    PENDING_REVIEW: 'pendingReview',
    POST_CLOSE_PENDING: 'postClosePending',
    POST_CLOSE_MONITORING: 'postCloseMonitoring',
    POST_CLOSE_NOT_ACTIVE: 'postCloseNotActive',
    PROCESSING_SUBMISSION: 'processingSubmission',
    MISSING_COVERAGE: 'missingCoverage',
  });
  
  
  const preClose = () => ({
    predictableActionArguments: true,
    id: 'preCloseCase',
    initial: CASE.DRAFT,
    states: {
      draft: {
        on: {
          SUBMIT_WITH_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            roles: ['admin', 'lender', 'reviewer'],
          },
          SUBMIT_WITHOUT_DOCUMENTS: {
            target: CASE.INSURANCE_PENDING,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      pendingReview: {
        on: {
          ASSIGN_LOAN: {
            target: CASE.REVIEW_IN_PROGRESS,
            roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      insurancePending: {
        on: {
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            roles: ['insuranceContact', 'admin', 'reviewer', 'lender'],
          },
          ESCALATE: {
            target: CASE.ESCALATED,
            roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      escalated: {
        on: {
          RETRY_FOLLOW_UPS: {
            target: CASE.INSURANCE_PENDING,
            roles: ['admin', 'lender', 'reviewer'],
          },
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            roles: ['admin', 'lender', 'insuranceContact', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      reviewInProgress: {
        on: {
          APPROVE: {
            target: CASE.CLOSED,
            roles: ['admin', 'reviewer'],
            condition: { _gt: [{ var: 'case.reviewsCount' }, 0] },
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      closed: {
        type: 'final',
        on: {
          UNAPPROVE: {
            target: CASE.REVIEW_IN_PROGRESS,
            roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      closedDead: { type: 'final' },
    },
  })
  
  
  const postClose = () => ({
    predictableActionArguments: true,
    id: 'postCloseCase',
    initial: CASE.DRAFT,
    states: {
      draft: {
        on: {
          SUBMIT_WITH_PRE_APPROVAL: {
            target: CASE.PROCESSING_SUBMISSION,
            roles: ['lender', 'admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, true] },
          },
          SUBMIT_WITHOUT_PRE_APPROVAL: {
            target: CASE.PENDING_REVIEW,
            roles: ['lender', 'admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, false] },
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
          },
        },
      },
      pendingReview: {
        on: {
          APPROVE: {
            target: CASE.POST_CLOSE_MONITORING,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
            condition: {
              and: [
                { _eq: [{ var: 'case.wasPreApproved' }, false] },
                { _gt: [{ var: 'case.reviewsCount' }, 0] },
              ],
            },
          },
          REQUEST_ADDITIONAL_COVERAGE: {
            target: CASE.MISSING_COVERAGE,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, false] },
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, false] },
          },
        },
      },
      processingSubmission: {
        on: {
          APPROVE: {
            target: CASE.POST_CLOSE_MONITORING,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
            condition: {
              and: [
                { _eq: [{ var: 'case.wasPreApproved' }, true] },
                { _gt: [{ var: 'case.reviewsCount' }, 0] },
              ],
            },
          },
          REQUEST_ADDITIONAL_COVERAGE: {
            target: CASE.MISSING_COVERAGE,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, true] },
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, true] },
          },
        },
      },
      missingCoverage: {
        on: {
          PROVIDE_ADDITIONAL_COVERAGE: {
            target: CASE.PROCESSING_SUBMISSION,
            roles: ['lender', 'admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, true] },
          },
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            roles: ['lender', 'admin', 'reviewer', 'lenderReviewer'],
            condition: { _eq: [{ var: 'case.wasPreApproved' }, false] },
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
          },
        },
      },
      postCloseMonitoring: {
        on: {
          NOTIFY_OF_NON_COMPLIANCE: {
            target: CASE.POST_CLOSE_PENDING,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
          },
          SUBMIT_ACTIONABLE_NOTICE: {
            target: CASE.POST_CLOSE_PENDING,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
          },
          UNAPPROVE: {
            target: CASE.POST_CLOSE_PENDING,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
          },
        },
      },
      postClosePending: {
        on: {
          APPROVE: {
            target: CASE.POST_CLOSE_MONITORING,
            roles: ['admin', 'reviewer', 'lenderReviewer'],
            condition: {
              _gt: [{ var: 'case.reviewsCount' }, 0],
            },
          },
          CANCEL: {
            target: CASE.POST_CLOSE_NOT_ACTIVE,
            roles: ['admin', 'lender', 'reviewer', 'lenderReviewer'],
          },
        },
      },
      postCloseNotActive: {
        type: 'final',
      },
    },
})

const preCloseStatesDefinition_v5 = {
    always: {
        actions: [() => console.log("ALWAYS")]
    },
    entry: [() => console.log('GLOBAL ENTRY')],
    exit: [() => console.log('GLOBAL EXIT')],
    types: {} as { events: { type: string, param: any }},
    context: ({ input }) => ({
        initialContextValue: "asdasd",
        ...input,
    }),
    output: () => "externalOutput",
    id: 'preCloseCase',
    initial: CASE.DRAFT,
    states: {
      [CASE.DRAFT]: {
        output: () => "internalOutput",
        initial: 'internalInitial',
        states: {
            internalInitial: {
                on: {
                    toMid: {
                        target: 'internalMid',
                        action: () => {
                            console.log("TO internalMid");
                            return 'internalMid';
                        },
                    },
                }
            },
            internalMid: {
                on: {
                    toFinal: {
                        target: 'internalFinal',
                        action: () => {
                            console.log("TO internalFinal");
                            return 'toFinal';
                        },
                    },
                }
            },
            internalFinal: {
                type: 'final' as const,
            },
        },
        on: {
          SUBMIT_WITH_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            actions: [({ context, event}) => {
                console.log("TO PENDING_REVIEW", context, event)

                return Promise.resolve("resolvedToPendingReview");
            }],
            //roles: ['admin', 'lender', 'reviewer'],
          },
          SUBMIT_WITHOUT_DOCUMENTS: {
            target: CASE.INSURANCE_PENDING,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.PENDING_REVIEW]: {
        on: {
          ASSIGN_LOAN: {
            target: CASE.REVIEW_IN_PROGRESS,
            guard: ({ context, event }) => {
                // if (event.param === 333) {
                //     throw new Error();
                // }

                return true;
            },
            actions: [
                ({ context, event}) => {
                    console.log("TO ASSIGN_LOAN", context, event)
                },
                { type: 'testAction' as const, params: 123 },
            ],
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.INSURANCE_PENDING]: {
        on: {
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            //roles: ['insuranceContact', 'admin', 'reviewer', 'lender'],
          },
          ESCALATE: {
            target: CASE.ESCALATED,
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.ESCALATED]: {
        on: {
          RETRY_FOLLOW_UPS: {
            target: CASE.INSURANCE_PENDING,
            //roles: ['admin', 'lender', 'reviewer'],
          },
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            //roles: ['admin', 'lender', 'insuranceContact', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.REVIEW_IN_PROGRESS]: {
        on: {
          APPROVE: {
            target: CASE.CLOSED,
            actions: [() => "toClosedActionReturn"],
            //roles: ['admin', 'reviewer'],
            //condition: { _gt: [{ var: 'case.reviewsCount' }, 0] },
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.CLOSED]: {
        type: 'final' as const,
        on: {
          UNAPPROVE: {
            target: CASE.REVIEW_IN_PROGRESS,
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.CLOSED_DEAD]: {
        type: 'final' as const,
      },
    },
}

const preCloseStatesDefinition_v4 = {
    always: {
        actions: [() => console.log("ALWAYS")]
    },
    entry: [() => console.log('GLOBAL ENTRY')],
    exit: [() => console.log('GLOBAL EXIT')],
    types: {} as { events: { type: string, param: any }},
    context: (input) => {
        console.log("CONTEXT input", input);

        const r = {
            input,
            initialContextValue: "asdasd",
        };
        
        console.log("context return", r)
        return r;
    },
    output: () => "externalOutput",
    id: 'preCloseCase',
    initial: CASE.DRAFT,
    states: {
      [CASE.DRAFT]: {
        // output: () => "internalOutput",
        // initial: 'internalInitial',
        // states: {
        //     internalInitial: {
        //         on: {
        //             toMid: {
        //                 target: 'internalMid',
        //                 action: () => {
        //                     console.log("TO internalMid");
        //                     return 'internalMid';
        //                 },
        //             },
        //         }
        //     },
        //     internalMid: {
        //         on: {
        //             toFinal: {
        //                 target: 'internalFinal',
        //                 action: () => {
        //                     console.log("TO internalFinal");
        //                     return 'toFinal';
        //                 },
        //             },
        //         }
        //     },
        //     internalFinal: {
        //         type: 'final' as const,
        //     },
        // },
        on: {
          SUBMIT_WITH_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            // actions: [({ context, event}) => {
            //     console.log("TO PENDING_REVIEW", context, event)

            //     return Promise.resolve("resolvedToPendingReview");
            // }],
            //actions: [{ type: 'testAction' }, () => console.log("testAction2")],
            actions: () => console.log("testAction2"),
            //roles: ['admin', 'lender', 'reviewer'],
            cond: (context, event) => {
                console.log("GUARD", context("inputString"), event, event.someData === 123);
                
                return event.someData === 123;
            },
          },
          SUBMIT_WITHOUT_DOCUMENTS: {
            target: CASE.INSURANCE_PENDING,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.PENDING_REVIEW]: {
        on: {
          ASSIGN_LOAN: {
            target: CASE.REVIEW_IN_PROGRESS,
            guard: ({ context, event }) => {
                // if (event.param === 333) {
                //     throw new Error();
                // }

                return true;
            },
            actions: [
                // ({ context, event}) => {
                //     console.log("TO ASSIGN_LOAN", context, event)
                // },
                { type: 'testAction' as const, params: 123 },
            ],
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.INSURANCE_PENDING]: {
        on: {
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            //roles: ['insuranceContact', 'admin', 'reviewer', 'lender'],
          },
          ESCALATE: {
            target: CASE.ESCALATED,
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.ESCALATED]: {
        on: {
          RETRY_FOLLOW_UPS: {
            target: CASE.INSURANCE_PENDING,
            //roles: ['admin', 'lender', 'reviewer'],
          },
          UPLOAD_DOCUMENTS: {
            target: CASE.PENDING_REVIEW,
            //roles: ['admin', 'lender', 'insuranceContact', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.REVIEW_IN_PROGRESS]: {
        on: {
          APPROVE: {
            target: CASE.CLOSED,
            actions: [() => "toClosedActionReturn"],
            //roles: ['admin', 'reviewer'],
            //condition: { _gt: [{ var: 'case.reviewsCount' }, 0] },
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.CLOSED]: {
        type: 'final' as const,
        on: {
          UNAPPROVE: {
            target: CASE.REVIEW_IN_PROGRESS,
            //roles: ['admin', 'reviewer'],
          },
          CANCEL: {
            target: CASE.CLOSED_DEAD,
            //roles: ['admin', 'lender', 'reviewer'],
          },
        },
      },
      [CASE.CLOSED_DEAD]: {
        // type: 'final' as const,
      },
    },
}

@Injectable()
export class StateMachineService {
    stateMachine_v5: any;
    stateMachine_v4: any;

    constructor() {
        this.stateMachine_v5 = setup({
            actions: {
                testAction: (_, params: unknown) => console.log("TEST ACTION ", params)
            },
        }).createMachine(preCloseStatesDefinition_v5);

        this.stateMachine_v4 = createMachine_v4(preCloseStatesDefinition_v4, {
            actions: {
                testAction: () => console.log("TEST ACTION")
            }
        });
    }

    transition_v4 (transitionName: string) {
        console.log("TRANSITION", transitionName);

        const state0 = this.stateMachine_v4.transition(this.stateMachine_v4.initialState, {
            type: 'SUBMIT_WITH_DOCUMENTS',
            someData: 123,
        });
        console.log("STATE1", state0.value, state0);

        const state1 = this.stateMachine_v4.transition(state0.value, 'SUBMIT_WITH_DOCUMENTS');
        console.log("STATE1", state1.value, state1);

        const state2 = this.stateMachine_v4.transition(state1.value, 'ASSIGN_LOAN');
        console.log("STATE2", state2.value, state2);

        const state3 = this.stateMachine_v4.transition(state2.value, 'APPROVE');
        console.log("STATE3", state3.value, state3);

        return transitionName;
    }

    transition_v5 (transitionName: string) {
        console.log("TRANSITION", transitionName);
        const input = { testContext: "testontexr" };
        const actor = createActor(this.stateMachine_v5, { input });

        const state1 = actor.getSnapshot();
        console.log("STATE1", state1.value, state1.output, state1.status)

        actor.start();
        const state2 = actor.getSnapshot();
        console.log("STATE2", state2.value, state2.output, state2.status)
        console.log(Object.keys(state2))

        actor.send({
            type: "toMid",
        });
        const state2internalMid = actor.getSnapshot();
        console.log("STATE2 MID", state2internalMid.value, state2internalMid.output, state2internalMid.status)

        actor.send({
            type: "toFinal",
        });
        const state2internalFinal = actor.getSnapshot();
        console.log("STATE2 FINAL", state2internalFinal.value, state2internalFinal.output, state2internalFinal.status)


        actor.send({
            type: "SUBMIT_WITH_DOCUMENTS",
            //@ts-ignore
            param: 123,
        });

        const state3 = actor.getSnapshot();
        const event = {
            type: "ASSIGN_LOAN",
            //@ts-ignore
            param: 333,
        };
        console.log("STATE3", state3.value, state3.output, state3.status)

        actor.send(event);

        const state4 = actor.getSnapshot();
        console.log("STATE4", state4.value, state4.output, state4.status)

        actor.send({
            type: "APPROVE",
        });

        const state5 = actor.getSnapshot();
        console.log("STATE5", state5.value, state5.output, state5.status)
        //, state4.can(event)

        return transitionName;
    }
}
