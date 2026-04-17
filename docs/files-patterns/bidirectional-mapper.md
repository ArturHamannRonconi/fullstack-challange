> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._
>
> _O mapper é agnóstico de banco: recebe/retorna os tipos derivados do Prisma (`IAnySchema` = `Prisma.AnyGetPayload<{ include: typeof anyInclude }>`) e nunca importa `PrismaClient`. A conversão para o shape de escrita (`create`/`update`) é responsabilidade do repository._

## any.mapper.ts
```ts
import {
  IdValueObject,
  DateValueObject,
  IBidirectionalMapper,
} from "ddd-tool-kit";

import { IAnySchema } from "../../schema/any.schema";
import { IAny2Schema } from "../../schema/any2.schema";
import { AnyAggregate } from "../../../domain/any.aggregate-root";
import { AnyEntity } from "../../../domain/entities/any/any.entity";
import { PasswordValueObject } from "../../../domain/value-objects/password/password.value-object";
import { NameValueObject } from "../../../domain/value-objects/name/name.value-object";

class AnyMapper implements IBidirectionalMapper<IAnySchema, AnyAggregate> {
  constructor(
    private readonly any2Mapper: IBidirectionalMapper<
      IAny2Schema,
      AnyEntity
    >,
  ) {}

  toRightSide(leftSide: IAnySchema): AnyAggregate {
    return AnyAggregate.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      anys: leftSide.anys.map((any2) =>
        this.any2Mapper.toRightSide(any2),
      ),
      name: NameValueObject.init({
        value: leftSide.name,
      }).result as NameValueObject,
      password: PasswordValueObject.init({ value: leftSide.password })
        .result as PasswordValueObject,
      createdAt: DateValueObject.init({ value: leftSide.createdAt })
        .result as DateValueObject,
      updatedAt: DateValueObject.init({ value: leftSide.updatedAt })
        .result as DateValueObject,
    }).result as AnyAggregate;
  }

  toLeftSide(rightSide: AnyAggregate): IAnySchema {
    return {
      id: rightSide.id.value,
      name: rightSide.name.value,
      password: rightSide.password.value,
      createdAt: rightSide.createdAt.value,
      updatedAt: rightSide.updatedAt.value,
      anys: rightSide.anys.map((any2) =>
        this.any2Mapper.toLeftSide(any2),
      ),
    };
  }
}

export { AnyMapper };
```
