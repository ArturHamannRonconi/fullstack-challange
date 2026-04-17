> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._
>
> _Fluxos suportados pelos mesmos dois métodos (`findBy*` + `save`):_
> _- **GET**: `controller → service → repository → postgres → mapper → aggregate`._
> _- **POST**: `controller → service → domain (build aggregate) → repository.save → mapper → postgres`._
> _- **PATCH/PUT**: `controller → service → repository.findById → postgres → mapper → aggregate → mutação em memória → repository.save → mapper → postgres`._

## Example usage in any.service.ts

### Create flow (POST)
```ts
const initAny = AnyAggregate.init({ ... });
if (initAny.isFailure) return throwFailOutput(initAny);

const any = initAny.result as AnyAggregate;

await this.anyRepository.save(any);
```

### Update flow (PATCH/PUT)
```ts
const any = await this.anyRepository.findById(id);
if (!any) return throwFailOutput(Output.fail(ANY_DOESNT_EXISTS));

any.changeName(newName); // mutação em memória via método do agregado

await this.anyRepository.save(any);
```

## any-repository.interface.ts
```ts
import { IdValueObject } from "ddd-tool-kit";
import { AnyAggregate } from "../../../domain/aggregate/any.aggregate-root";
import { NameValueObject } from "../../../domain/value-objects/name/name.value-object";

interface AnyRepository {
  save(any: AnyAggregate): Promise<void>;
  findById(id: IdValueObject): Promise<AnyAggregate | null>;
  findByName(name: NameValueObject): Promise<AnyAggregate | null>;
}

export { AnyRepository };
```

## Implementation in Prisma: prisma.any-repository.ts
```ts
import { PrismaClient } from "@prisma/client";
import { IBidirectionalMapper, IdValueObject } from "ddd-tool-kit";

import { AnyRepository } from "../any.repository";
import { anyInclude, IAnySchema } from "../../../schema/any.schema";
import { AnyAggregate } from "../../../../domain/any.aggregate-root";
import { NameValueObject } from "../../../../domain/value-objects/name/name.value-object";

class AnyPrismaRepository implements AnyRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly AnyMapper: IBidirectionalMapper<
      IAnySchema,
      AnyAggregate
    >,
  ) {}

  async findById(id: IdValueObject): Promise<AnyAggregate | null> {
    const anySchema = await this.prisma.any.findUnique({
      where: { id: id.value },
      include: anyInclude,
    });

    if (!anySchema) return null;

    return this.AnyMapper.toRightSide(anySchema);
  }

  async findByName(
    name: NameValueObject,
  ): Promise<AnyAggregate | null> {
    const anySchema = await this.prisma.any.findFirst({
      where: { name: name.value },
      include: anyInclude,
    });

    if (!anySchema) return null;

    return this.AnyMapper.toRightSide(anySchema);
  }

  async save(any: AnyAggregate): Promise<void> {
    const { anys, ...scalars } = this.AnyMapper.toLeftSide(any);

    await this.prisma.$transaction(async (tx) => {
      const alreadyExists = await tx.any.findUnique({
        where: { id: scalars.id },
        select: { id: true },
      });

      if (!alreadyExists) {
        await tx.any.create({ data: scalars });
      } else {
        await tx.any.update({
          where: { id: scalars.id },
          data: { ...scalars, updatedAt: new Date() },
        });
        await tx.any2.deleteMany({ where: { anyId: scalars.id } });
      }

      if (anys.length > 0) {
        await tx.any2.createMany({
          data: anys.map((child) => ({ ...child, anyId: scalars.id })),
        });
      }
    });
  }
}

export { AnyPrismaRepository };
```

> _**Why `$transaction` + delete/recreate children?**_  
> _O agregado é a unidade de consistência: ao salvar, o estado em memória é a fonte da verdade. Substituir a coleção de filhos evita drift entre banco e agregado e cobre o fluxo PATCH/PUT (load → mutate → save) sem exigir diffing manual. Se a tabela filha crescer o bastante para inviabilizar esse padrão, troque por um diff explícito (upsert por id + delete do que saiu do agregado) — mas comece pelo simples._
