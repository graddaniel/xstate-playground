export const PROJECT_GRAPH = 'project-graph'

export enum ProjectState {
    NEW = 'new',
    IN_PROGRESS = 'in-progress',
    DONE = 'done'
}

export enum ProjectTransition {
    START = 'start',
    FINISH = 'finish'
}
