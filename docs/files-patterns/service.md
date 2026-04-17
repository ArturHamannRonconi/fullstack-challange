> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._



## service.interface.ts
```ts
import { Output, IError } from "ddd-tool-kit";

// IError is any object with { statusCode: HttpStatus; message: string; };

// Output<T> is some object with: { isSuccess: boolean; isFailure: boolean; result: T };

interface Service<I, O> {
  execute(input: I): Promise<Output<O> | Output<IError>>
}

export { Service };
```

## create-any.input.ts
```ts
interface ICreateAnyServiceInput {
  any: string;
  any: number;
  any: boolean;
}

export { ICreateAnyServiceInput };
```

## create-any.output.ts
```ts
interface ICreateAnyServiceOutput {
  any: string;
  any: number;
  any: boolean;
}

export { ICreateAnyServiceOutput };
```

## create-any.service.ts
```ts
import { throwFailInternalServer } from "ddd-tool-kit";

class CreateAnyService
  implements Service<
    ICreateAnyServiceInput,
    ICreateAnyServiceOutput
  >
{
  constructor(private readonly anyRepository: AnyRepository) {}

  async execute(
    input: ICreateAnyServiceInput
  ): Promise<Output<ICreateAnyServiceOutput> | Output<IError>> {
    try {
      // Any business logics
      ...
      const any = initAnyAggregate.result as AnyAggregate;

      await this.anyRepository.save(any);
    } catch (error) {
      return throwFailInternalServer(error);
    }
  } 
}

```