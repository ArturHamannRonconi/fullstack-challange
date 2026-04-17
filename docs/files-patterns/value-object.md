> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._

## Commom usage in any.service.ts
```ts
import { throwFailOutput } from "ddd-tool-kit";
import { AnyValueObject } from "./any.value-object";

...

const initAny = AnyValueObject.ini({ value: "any correspondent value" });
if (initAny.isFailure) return throwFailOutput(initAny)

const any = initAny.result as AnyValueObject; 

```

## any.props.ts
```ts
import { IBaseDomainValueObject } from "ddd-tool-kit";

interface IAnyValueObject extends IBaseDomainValueObject<string | number | boolean> {}

export { IAnyValueObject };
```

## any.errors.ts
```ts
import { HttpStatus } from "ddd-tool-kit";

const INVALID_ANY = {
  message: "Any must contain less than 20 characters.", // You will change this message
  statusCode: HttpStatus.BAD_REQUEST,
};

export { INVALID_ANY };
```

## any.value-object.ts
```ts
import { Output, ValueObject } from "ddd-tool-kit";
import { INVALID_ANY } from "./any.errors";
import { IAnyValueObject } from "./any.props";

class AnyValueObject extends ValueObject<IAnyValueObject> {
  private constructor(props: IAnyValueObject) {
    super(props);
  }

  protected sanitizeProps(): void {
    this.props.value = this.props.value.trim();
  }

  protected isValidProps(): boolean {
    return this.value.length <= 20;
  }

  static init(props: IAnyValueObject) {
    const any = new AnyValueObject(props);

    const isInvalidProps = !any.isValidProps();
    if (isInvalidProps) return Output.fail(INVALID_ANY);

    return Output.success(any);
  }
}

export { AnyValueObject };
```




