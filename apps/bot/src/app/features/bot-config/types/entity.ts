import type { TrainStatus } from './model';

export interface Entity {
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

export interface EntityValue {
  entityId: string;
  entityValueId: string;
  modelVersion: string;
  entityType: EntityType;
  entityValue: string; // 대표값
  entityTypeValues: string; // 유사어
  trainId: string;
  workUser: number;
  workTime: string;
}
export enum EntityType {
  SAME = 'SAME', // 동의어
  SYNONYMS = 'SYNONYMS', // 유사어
  PATTERNS = 'PATTERNS', // 패턴형
}

export type EntityValueListItem = Pick<EntityValue, 'entityValueId' | 'entityValue' | 'entityType' | 'entityTypeValues'>;
