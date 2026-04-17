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


const initAnyAggregate = AnyAggregate.init({ anys: [anyEntity], ... });
if (initAnyAggregate.isFailure) return throwFailOutput(initAnyAggregate);

const anyAggregate = initAnyAggregate.result as AnyAggregate;
```

## any.props.ts
```ts
import { IBaseDomainAggregate } from "ddd-tool-kit";

import { PasswordValueObject } from "./value-objects/password/password.value-object";
import { NameValueObject } from "./value-objects/name/name.value-object";
import { AnyEntity } from "./entities/any/any.entity";

interface IAnyProps extends IBaseDomainAggregate {
  anys: AnyEntity[];
  name: NameValueObject;
  password: PasswordValueObject;
}

export { IAnyProps };
```

## any.error.ts
```ts
import { HttpStatus } from "ddd-tool-kit";

const INVALID_ANY = {
  message: "Invalid any.",
  statusCode: HttpStatus.BAD_REQUEST,
};

const ANY_DOESNT_EXISTS = {
  message: "Any does not exist.",
  statusCode: HttpStatus.NOT_FOUND,
};

export { INVALID_ANY, ANY_DOESNT_EXISTS };

```

## any.aggregate-root.ts
```ts
import { compareSync } from "bcryptjs";
import {
  IError,
  Output,
  throwFailOutput,
  verifyAllPropsExists,
  verifyAreValueObjects,
} from "ddd-tool-kit";

import { IAnyProps } from "./any.props";
import { AnyEntity } from "./entities/any/any.entity";
import { INVALID_ANY, ANY_DOESNT_EXISTS } from "./any.errors";
import { NameValueObject } from "./value-objects/name/name.value-object";

class AnyAggregate extends Aggregate<IAnyProps> {
  private readonly MAX_ANYS = 5;

  private constructor(props: IAnyProps) {
    super(props);
  }

  get name() {
    return this.props.name;
  }

  get password() {
    return this.props.password;
  }

  get anys() {
    return this.props.anys;
  }

  changeName(name: NameValueObject) {
    this.props.name = name;
  }

  // You can add many methods thats match for business rules associated for this aggregate
  ...

  protected isValidProps(): boolean {
    const valueObjects = ["name", "password"];

    valueObjects.push(...this.defaultValueObjects);

    const requiredProps = [...valueObjects];

    const allPropsExists = verifyAllPropsExists(requiredProps, this);
    const areValueObjects = verifyAreValueObjects(valueObjects, this);

    return allPropsExists && areValueObjects;
  }

  static init(props: IAnyProps) {
    const any = new AnyAggregate(props);

    const isInvalidProps = !any.isValidProps();
    if (isInvalidProps) return Output.fail(INVALID_ANY);

    return Output.success(any);
  }
}

export { AnyAggregate };
```