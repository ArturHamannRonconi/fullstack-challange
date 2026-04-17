> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._
>
> _Com Prisma, o schema canônico mora em `prisma/schema.prisma`. Os arquivos `*.schema.ts` apenas derivam tipos do Prisma Client e centralizam o `include` usado por repository e mapper para hidratar o agregado — evita que cada camada redeclaração das relações._

## prisma/schema.prisma
```prisma
model Any {
  id        String   @id
  name      String
  password  String
  createdAt DateTime
  updatedAt DateTime

  anys Any2[]

  @@index([name])
  @@map("anys")
}
```

## any.schema.ts
```ts
import { Prisma } from "@prisma/client";

const anyInclude = {
  anys: true,
} satisfies Prisma.AnyInclude;

type IAnySchema = Prisma.AnyGetPayload<{ include: typeof anyInclude }>;

export { anyInclude, IAnySchema };
```

## any2.schema.ts
```ts
export type { Any2 as IAny2Schema } from "@prisma/client";
```
