import type { TrainStatus } from './model';

export default interface Entity {
  entityId: string;
  entityName: string;
  entityDesc: string;
  workUser: number;
  workTime: string;
}

export type EntityListItem = Entity & {
  trainStatus: TrainStatus;
  valueCount: number;
  entityValues: string[];
};

export type EntityItem = Entity;
export type EntityCreateDatas = Pick<Entity, 'entityName' | 'entityDesc'>;
export type EntityBasicInfoUpdateDatas = Pick<Entity, 'entityName' | 'entityDesc'>;
