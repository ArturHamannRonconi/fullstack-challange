> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._

## Commom usage in any.service.ts
```ts
import { throwFailOutput } from "ddd-tool-kit";
import { AnyValueObject } from "./any.value-object";

...

const initAnyValueObject = AnyValueObject.ini({ value: "any correspondent value" });
if (initAnyValueObject.isFailure) return throwFailOutput(initAnyValueObject)

const anyValueObject = initAny.result as AnyValueObject; 

const initAnyEntity = AnyEntity.ini({
  anys:[],
  any: anyValueObject,
  expiresAt: DateValueObject.getDefault(),
});

if (initAnyEntity.isFailure) {
  return throwFailOutput(initAnyEntity);
}

const anyEntity = initAnyEntity.result as AnyValueObject; 

```

## any.props.ts
```ts
import { DateValueObject, IBaseDomainEntity } from "ddd-tool-kit";

interface IAnyProps extends IBaseDomainEntity {
  any: AnyValueObject;
  ...
  anys: AnyEntity[];
  expiresAt: DateValueObject; // This is only concrect example
}

export { IAnyProps };
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

## any.entity.ts
```ts
import {
  Entity,
  Output,
  IdValueObject,
  DateValueObject,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";

import bcryptjs from "bcryptjs";

import { IAnyProps } from "./any.props";
import { INVALID_ANY } from "./any.errors";

export class AnyEntity extends Entity<IAnyProps> {
  private static readonly ANY_CONSTANT = 30;

  private constructor(props: IAnyProps) {
    super(props);
  }

  get any() {
    return this.props.any;
  }

  get anys() {
    return this.props.anys;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  get hash() {
    const salt = bcryptjs.genSaltSync();
    return bcryptjs.hashSync(this.id.value, salt);
  }

  get secondsUntilExpiration(): number {
    const now = new Date();
    const expiresAt = this.expiresAt.value;

    const diffInSeconds = Math.floor(
      (expiresAt.getTime() - now.getTime()) / 1000,
    );

    // ensure thats not returning negative number
    return Math.max(diffInSeconds, 0);
  }

  renew(): void {
    const expiresAt = DateValueObject.getDefault();
    expiresAt.addDays(SessionEntity.ANY_CONSTANT);

    this.props.expiresAt = expiresAt;
    this.props.id = IdValueObject.getDefault();
  }

  protected sanitizeProps(): void {}
  protected isValidProps(): boolean {
    const valueObjects = ["expiresAt"];

    valueObjects.push(...this.defaultValueObjects);

    const requiredProps = [...valueObjects];

    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IAnyProps) {
    const any = new AnyEntity(props);

    const isInvalidProps = !any.isValidProps();
    if (isInvalidProps) return Output.fail(INVALID_ANY);    

    return Output.success(any);
  }
}
```