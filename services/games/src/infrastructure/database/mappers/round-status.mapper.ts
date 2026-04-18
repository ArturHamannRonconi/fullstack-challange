import { Injectable } from "@nestjs/common";
import {
  DateValueObject,
  type IBidirectionalMapper,
  IdValueObject,
} from "ddd-tool-kit";

import { RoundStatusEntity } from "../../../domain/entities/round-status/round-status.entity";
import {
  RoundStatusTypeValueObject,
} from "../../../domain/value-objects/round-status-type/round-status-type.value-object";
import type { RoundStatusType } from "../../../domain/value-objects/round-status-type/round-status-type.props";
import type { IRoundStatusSchema } from "../schema/round.schema";

@Injectable()
export class RoundStatusMapper
  implements IBidirectionalMapper<IRoundStatusSchema, RoundStatusEntity>
{
  toRightSide(leftSide: IRoundStatusSchema): RoundStatusEntity {
    return RoundStatusEntity.init({
      id: IdValueObject.init({ value: leftSide.id }).result as IdValueObject,
      status: RoundStatusTypeValueObject.init({
        value: leftSide.status as RoundStatusType,
      }).result as RoundStatusTypeValueObject,
      statusDate: DateValueObject.init({ value: leftSide.statusDate })
        .result as DateValueObject,
    }).result as RoundStatusEntity;
  }

  toLeftSide(rightSide: RoundStatusEntity): IRoundStatusSchema {
    return {
      id: rightSide.id.value,
      roundId: "",
      status: rightSide.status.value,
      statusDate: rightSide.statusDate.value,
    };
  }
}
