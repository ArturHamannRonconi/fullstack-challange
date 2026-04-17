import type { IError, Output } from "ddd-tool-kit";

export interface Service<Input, Success = void> {
  execute(input: Input): Promise<Output<Success> | Output<IError>>;
}
