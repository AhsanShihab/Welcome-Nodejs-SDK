import { Resource, ResourceCtor } from "./resource";
import { TaskSubStep, TaskSubStepData } from "./task-substep";

interface Common {
  id: string;
  title: string;
  isCompleted: boolean;
  description: string | null;
}

export interface TaskStepData extends Common {
  dueAt: string | null;
  subSteps: TaskSubStepData[];
}

export interface TaskStep extends Common {
  dueAt: Date | null;
  subSteps: TaskSubStep[];
}
export class TaskStep extends Resource<TaskStepData> {
  static dateFields = ["dueAt"] as const;
  static nested: Record<string, ResourceCtor> = { subSteps: TaskSubStep };
}
