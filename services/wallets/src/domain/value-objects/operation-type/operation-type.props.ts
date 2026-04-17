import type { IBaseDomainValueObject } from "ddd-tool-kit";

export const OPERATION_TYPES = ["DEPOSIT", "WITHDRAW", "RESERVE", "LOST", "WIN"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export interface IOperationTypeProps extends IBaseDomainValueObject<OperationType> {}
