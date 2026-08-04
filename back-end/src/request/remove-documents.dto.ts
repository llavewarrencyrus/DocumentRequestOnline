import { IsArray, IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RemoveDocumentsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  documentIds: number[];

  @IsString()
  @IsOptional()
  remarks?: string;
}
