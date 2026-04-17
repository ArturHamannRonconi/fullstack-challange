> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._

## any.mapper.ts
```ts
import { IUnidirectionalMapper } from "ddd-tool-kit";

import { AnyEntity } from "../../../domain/entities/any/any.entity";
import { AnyDto } from "../../../domain/dtos/any.dto";

class AnyDtoMapper
  implements IUnidirectionalMapper<AnyEntity, AnyDto>
{
  toRightSide(leftSide: AnyEntity): AnyDto {
    return {
      id: leftSide.id.value,
      name: leftSide.name.value,
      ...
    };
  }
}

export { AnyDtoMapper };
```