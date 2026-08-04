import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class DeclineRequestDto {
    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsString()
    @IsOptional()
    approvedBy?: string;
}