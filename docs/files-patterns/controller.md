> _**Observation:**_  
> _You will need to replace "Any" with the correct names when writing the files._


## create-any.controller.ts
```ts

import { Controller, Get, Post } from '@nestjs/common';
import { CreateAnyService } from "...";
import { ICreateAnyServiceOutput } from "...";

@Controller('any')
class CreateAnyController {
  constructor(private createAnyService: CreateAnyService) {}

  @Post()
  @HttpCode(2xx)
  async execute() {
    const output = await this
      .createAnyService
      .execute({ ... });

    if (output.isFailure) {
      /*
        In this case Output is equal to any object error, example:
        const INVALID_ANY = {
          message: "Any must contain less than 20 characters.",
          statusCode: HttpStatus.BAD_REQUEST,
        };
      */
      const error = getCorrectNestjsErrorByOutput(output);
      throw errror;
    }

    // In this case output.result is equal to to the returning output
    return output.result as ICreateAnyServiceOutput;
  }
}

export { CreateAnyController };

```